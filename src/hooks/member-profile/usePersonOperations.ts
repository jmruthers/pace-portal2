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
  } | null;
};

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

      const { error: personError } = await client
        .from('core_person')
        .update(personPatch)
        .eq('id', input.personId);

      if (personError) {
        return err({
          code: 'PERSON_UPDATE',
          message: personError.message || 'Could not save personal details.',
        });
      }

      if (input.memberId && input.member) {
        const memberPatch: Database['public']['Tables']['core_member']['Update'] = {
          membership_type_id: input.member.membership_type_id,
          membership_number: input.member.membership_number?.trim() ?? null,
          membership_status: input.member.membership_status,
          updated_at: now,
          updated_by: userId,
        };
        const { error: memberError } = await client
          .from('core_member')
          .update(memberPatch)
          .eq('id', input.memberId)
          .eq('organisation_id', input.organisationId);

        if (memberError) {
          return err({
            code: 'MEMBER_UPDATE',
            message: memberError.message || 'Could not save membership details.',
          });
        }
      }

      return ok(undefined);
    } catch (e) {
      return err(normalizeToApiError(e, 'PERSON_MEMBER', 'Could not save profile.'));
    }
  };

  const mutation = useMutation({
    mutationFn: async (input: UpdatePersonMemberInput) => {
      const result = await updatePersonMember(input);
      if (!isOk(result)) throw new Error(result.error.message);
    },
  });

  return {
    updatePersonMember,
    savePersonMember: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
