import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

type MembershipStatus = Database['public']['Enums']['pace_membership_status'];
const PROFILE_DEBUG_LOGS =
  import.meta.env.DEV || String(import.meta.env.VITE_PROFILE_DEBUG_LOGS ?? '') === 'true';

function profileDebugLog(step: string, data?: Record<string, unknown>): void {
  if (!PROFILE_DEBUG_LOGS) return;
  if (data) {
    console.info(`[member-profile][person] ${step}`, data);
    return;
  }
  console.info(`[member-profile][person] ${step}`);
}

const MEMBERSHIP_STATUS_VALUES: readonly MembershipStatus[] = [
  'Provisional',
  'Cancelled',
  'Active',
  'Suspended',
  'Resigned',
] as const;

/**
 * Ensures only valid enum values are written; preserves existing when input is invalid or empty.
 */
export function normalizeMembershipStatus(
  existing: MembershipStatus | null | undefined,
  input: MembershipStatus | string | null | undefined
): MembershipStatus {
  if (input != null && (MEMBERSHIP_STATUS_VALUES as readonly string[]).includes(String(input))) {
    return input as MembershipStatus;
  }
  if (existing != null && (MEMBERSHIP_STATUS_VALUES as readonly string[]).includes(String(existing))) {
    return existing;
  }
  return 'Provisional';
}

export type UpdatePersonMemberInput = {
  personId: string;
  memberId: string | null;
  organisationId: string;
  person: {
    first_name: string;
    last_name: string;
    middle_name: string | null;
    preferred_name: string | null;
    email: string;
    date_of_birth: string;
    gender_id: number;
    pronoun_id: number;
    residential_address_id: string;
    postal_address_id: string;
  };
  member: {
    membership_type_id: number | null;
    membership_number: string | null;
    membership_status: MembershipStatus;
  };
};

async function persistPersonWithFallback(
  client: ReturnType<typeof toTypedSupabase>,
  input: UpdatePersonMemberInput,
  personPatch: Database['public']['Tables']['core_person']['Update']
): Promise<ApiResult<void>> {
  if (!client) {
    return err({ code: 'PERSON_NO_CLIENT', message: 'Client is not available.' });
  }
  profileDebugLog('direct_person_update:start', { personId: input.personId });
  const { data: personRows, error: personError } = await client
    .from('core_person')
    .update(personPatch)
    .select('id')
    .eq('id', input.personId);

  if (personError) {
    profileDebugLog('direct_person_update:error', { personId: input.personId, error: personError.message });
    return err({
      code: 'PERSON_UPDATE',
      message: personError.message || 'Could not save personal details.',
    });
  }
  profileDebugLog('direct_person_update:done', {
    personId: input.personId,
    rowsAffected: personRows?.length ?? 0,
  });
  if (personRows && personRows.length > 0) {
    return ok(undefined);
  }

  profileDebugLog('rpc_person_update:start', { personId: input.personId });
  const rpcPerson = await client.rpc('app_pace_person_update', {
    p_person_id: input.personId,
    p_first_name: personPatch.first_name ?? undefined,
    p_last_name: personPatch.last_name ?? undefined,
    p_middle_name: personPatch.middle_name ?? undefined,
    p_preferred_name: personPatch.preferred_name ?? undefined,
    p_email: personPatch.email ?? undefined,
  });
  if (rpcPerson.error || !rpcPerson.data || rpcPerson.data.length === 0) {
    profileDebugLog('rpc_person_update:error', {
      personId: input.personId,
      error: rpcPerson.error?.message ?? 'No rows returned',
    });
    return err({
      code: 'PERSON_UPDATE_NO_ROWS',
      message:
        rpcPerson.error?.message ||
        'Profile save was blocked by permissions. Contact support to enable member profile updates.',
    });
  }
  profileDebugLog('rpc_person_update:done', { personId: input.personId, rowsAffected: rpcPerson.data.length });
  return ok(undefined);
}

async function persistMemberWithFallback(
  client: ReturnType<typeof toTypedSupabase>,
  input: UpdatePersonMemberInput,
  personPatch: Database['public']['Tables']['core_person']['Update'],
  memberPatch: Database['public']['Tables']['core_member']['Update']
): Promise<ApiResult<void>> {
  if (!client) {
    return ok(undefined);
  }
  if (!input.memberId) return insertMissingMember(client, input, memberPatch);
  return updateExistingMemberWithFallback(client, input, personPatch, memberPatch);
}

async function insertMissingMember(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  input: UpdatePersonMemberInput,
  memberPatch: Database['public']['Tables']['core_member']['Update']
): Promise<ApiResult<void>> {
  profileDebugLog('member_insert:start', {
    personId: input.personId,
    organisationId: input.organisationId,
  });
  const { data: inserted, error: insertError } = await client
    .from('core_member')
    .upsert(
      {
        person_id: input.personId,
        organisation_id: input.organisationId,
        membership_type_id: memberPatch.membership_type_id ?? null,
        membership_number: memberPatch.membership_number ?? null,
        membership_status: memberPatch.membership_status ?? 'Provisional',
      },
      {
        onConflict: 'person_id,organisation_id',
      }
    )
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    profileDebugLog('member_insert:error', {
      personId: input.personId,
      organisationId: input.organisationId,
      error: insertError?.message ?? 'No row returned',
    });
    return err({
      code: 'MEMBER_INSERT',
      message:
        insertError?.message ||
        'No membership record exists and create was blocked. Ask pace-core2 to enable self-service core_member insert.',
    });
  }
  profileDebugLog('member_insert:done', {
    personId: input.personId,
    organisationId: input.organisationId,
    memberId: inserted.id,
  });
  return ok(undefined);
}

async function updateExistingMemberWithFallback(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  input: UpdatePersonMemberInput,
  personPatch: Database['public']['Tables']['core_person']['Update'],
  memberPatch: Database['public']['Tables']['core_member']['Update']
): Promise<ApiResult<void>> {
  if (!input.memberId) return ok(undefined);
  profileDebugLog('direct_member_update:start', {
    memberId: input.memberId,
    organisationId: input.organisationId,
  });
  const { data: memberRows, error: memberError } = await client
    .from('core_member')
    .update(memberPatch)
    .select('id')
    .eq('id', input.memberId)
    .eq('organisation_id', input.organisationId);

  if (memberError) {
    profileDebugLog('direct_member_update:error', {
      memberId: input.memberId,
      organisationId: input.organisationId,
      error: memberError.message,
    });
    return err({
      code: 'MEMBER_UPDATE',
      message: memberError.message || 'Could not save membership details.',
    });
  }
  profileDebugLog('direct_member_update:done', {
    memberId: input.memberId,
    organisationId: input.organisationId,
    rowsAffected: memberRows?.length ?? 0,
  });
  if (memberRows && memberRows.length > 0) {
    return ok(undefined);
  }

  profileDebugLog('rpc_member_update:start', {
    memberId: input.memberId,
    organisationId: input.organisationId,
  });
  const rpcMember = await client.rpc('app_pace_member_update', {
    p_member_id: input.memberId,
    p_date_of_birth: personPatch.date_of_birth ?? undefined,
    p_gender_id: personPatch.gender_id ?? undefined,
    p_pronoun_id: personPatch.pronoun_id ?? undefined,
    p_membership_type_id: memberPatch.membership_type_id ?? undefined,
    p_membership_number: memberPatch.membership_number ?? undefined,
    p_membership_status: memberPatch.membership_status ?? undefined,
  });
  if (rpcMember.error || !rpcMember.data || rpcMember.data.length === 0) {
    profileDebugLog('rpc_member_update:error', {
      memberId: input.memberId,
      organisationId: input.organisationId,
      error: rpcMember.error?.message ?? 'No rows returned',
    });
    return err({
      code: 'MEMBER_UPDATE_NO_ROWS',
      message:
        rpcMember.error?.message ||
        'Membership save was blocked by permissions. Contact support to enable member profile updates.',
    });
  }
  profileDebugLog('rpc_member_update:done', {
    memberId: input.memberId,
    organisationId: input.organisationId,
    rowsAffected: rpcMember.data.length,
  });
  return ok(undefined);
}

/**
 * Persists `core_person` and `core_member` updates for the member profile flow.
 */
export function usePersonOperations() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const { user } = useUnifiedAuthContext();
  const userId = user?.id ?? null;

  const updatePersonMember = async (input: UpdatePersonMemberInput): Promise<ApiResult<void>> => {
    try {
      if (!client) {
        return err({ code: 'PERSON_NO_CLIENT', message: 'Client is not available.' });
      }
      const now = new Date().toISOString();
      const personPatch: Database['public']['Tables']['core_person']['Update'] = {
        first_name: input.person.first_name.trim(),
        last_name: input.person.last_name.trim(),
        middle_name: input.person.middle_name?.trim() ?? null,
        preferred_name: input.person.preferred_name?.trim() ?? null,
        email: input.person.email.trim(),
        date_of_birth: input.person.date_of_birth,
        gender_id: input.person.gender_id,
        pronoun_id: input.person.pronoun_id,
        residential_address_id: input.person.residential_address_id,
        postal_address_id: input.person.postal_address_id,
        updated_at: now,
        updated_by: userId,
      };

      const personResult = await persistPersonWithFallback(client, input, personPatch);
      if (!isOk(personResult)) return personResult;

      const memberPatch: Database['public']['Tables']['core_member']['Update'] = {
        membership_type_id: input.member.membership_type_id,
        membership_number: input.member.membership_number?.trim() ?? null,
        membership_status: input.member.membership_status,
        updated_at: now,
        updated_by: userId,
      };
      const memberResult = await persistMemberWithFallback(client, input, personPatch, memberPatch);
      if (!isOk(memberResult)) return memberResult;

      return ok(undefined);
    } catch (e) {
      return err(normalizeToApiError(e, 'PERSON_MEMBER', 'Could not save profile.'));
    }
  };

  const mutation = useMutation({
    mutationFn: async (input: UpdatePersonMemberInput) => {
      profileDebugLog('save_person_member:start', {
        personId: input.personId,
        memberId: input.memberId,
        organisationId: input.organisationId,
      });
      const result = await updatePersonMember(input);
      if (!isOk(result)) {
        profileDebugLog('save_person_member:error', {
          personId: input.personId,
          memberId: input.memberId,
          organisationId: input.organisationId,
          code: result.error.code,
          message: result.error.message,
        });
        throw new Error(`${result.error.code}: ${result.error.message}`);
      }
      profileDebugLog('save_person_member:done', {
        personId: input.personId,
        memberId: input.memberId,
        organisationId: input.organisationId,
      });
    },
  });

  return {
    updatePersonMember,
    savePersonMember: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
