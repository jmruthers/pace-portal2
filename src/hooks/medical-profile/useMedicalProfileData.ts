import { useQuery } from '@tanstack/react-query';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { err, isOk, normalizeToApiError, ok, type ApiResult } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

type MediProfileRow = Database['public']['Tables']['medi_profile']['Row'];
type MediRpcRow = Database['public']['Functions']['data_medi_profile_get']['Returns'][number];

export type MedicalConditionSummaryRow = Pick<
  Database['public']['Tables']['medi_condition']['Row'],
  'id' | 'name' | 'severity' | 'medical_alert' | 'is_active'
>;

/** Full condition row from `get_medi_conditions` RPC (PR10/PR11). */
export type MediConditionDetail = Database['public']['Functions']['get_medi_conditions']['Returns'][number];

export type MedicalProfileLoadModel = {
  profile: MediProfileRow | null;
  /** `data_medi_profile_get.diet_type_name` when the profile came from RPC (helps label when id formats differ). */
  dietTypeNameFromRpc: string | null;
  memberId: string;
  personId: string;
  conditions: MediConditionDetail[];
};

function mapRpcToRow(r: MediRpcRow): MediProfileRow {
  return {
    id: r.id,
    person_id: r.person_id,
    created_at: null,
    created_by: null,
    data_retention_until: r.data_retention_until,
    diet_type_id: r.diet_type_id,
    dietary_comments: r.dietary_comments,
    health_care_card_expiry: r.health_care_card_expiry,
    health_care_card_number: r.health_care_card_number,
    health_fund_name: r.health_fund_name,
    health_fund_number: r.health_fund_number,
    is_fully_immunised: r.is_fully_immunised,
    last_tetanus_date: r.last_tetanus_date,
    medicare_expiry: r.medicare_expiry,
    medicare_number: r.medicare_number,
    updated_at: null,
    updated_by: null,
  };
}

/**
 * Loads medical profile via `data_medi_profile_get` and a read-only condition summary for PR09 handoff (no CRUD).
 */
export async function fetchMedicalProfileData(
  secure: RBACSupabaseClient | null,
  memberId: string,
  organisationId: string
): Promise<ApiResult<MedicalProfileLoadModel>> {
  try {
    const client = toTypedSupabase(secure);
    if (!client || !memberId || !organisationId) {
      return err({
        code: 'MEDICAL_PROFILE_CONTEXT',
        message: 'Medical profile requires organisation and member context.',
      });
    }

    const { data: memberRow, error: memberErr } = await client
      .from('core_member')
      .select('person_id')
      .eq('id', memberId)
      .maybeSingle();

    if (memberErr || !memberRow?.person_id) {
      return err({
        code: 'MEDICAL_PROFILE_MEMBER',
        message: memberErr?.message ?? 'Could not resolve member for medical profile.',
      });
    }

    const personId = memberRow.person_id;

    const rpc = await client.rpc('data_medi_profile_get', { p_member_id: memberId });
    if (rpc.error) {
      return err({
        code: 'MEDICAL_PROFILE_LOAD',
        message: rpc.error.message || 'Could not load medical profile.',
      });
    }

    const rpcRows = (rpc.data ?? []) as MediRpcRow[];
    const firstRpc = rpcRows[0];
    let profile: MediProfileRow | null = firstRpc ? mapRpcToRow(firstRpc) : null;
    let dietTypeNameFromRpc: string | null = null;
    if (firstRpc?.diet_type_name?.trim()) {
      dietTypeNameFromRpc = firstRpc.diet_type_name.trim();
    }

    if (!profile) {
      const direct = await client.from('medi_profile').select('*').eq('person_id', personId).maybeSingle();
      if (direct.error) {
        return err({
          code: 'MEDICAL_PROFILE_LOAD',
          message: direct.error.message || 'Could not load medical profile.',
        });
      }
      profile = direct.data;
      dietTypeNameFromRpc = null;
    }

    let conditions: MediConditionDetail[] = [];
    if (profile?.id) {
      // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern -- database RPC name (PR09/PR10)
      const rpcCond = await client.rpc('get_medi_conditions', { p_profile_id: profile.id });
      if (rpcCond.error) {
        return err({
          code: 'MEDICAL_CONDITION_SUMMARY',
          message: rpcCond.error.message || 'Could not load conditions.',
        });
      }
      conditions = (rpcCond.data ?? []) as MediConditionDetail[];
    }

    return ok({
      profile,
      dietTypeNameFromRpc,
      memberId,
      personId,
      conditions,
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'MEDICAL_PROFILE', 'Could not load medical profile.'));
  }
}

export function useMedicalProfileData(effectiveMemberId: string | null) {
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const organisationId = org?.selectedOrganisation?.id ?? null;

  return useQuery({
    queryKey: ['medicalProfile', 'v1', organisationId, effectiveMemberId],
    enabled: Boolean(client && organisationId && effectiveMemberId),
    staleTime: 30_000,
    queryFn: async (): Promise<MedicalProfileLoadModel> => {
      if (!organisationId || !effectiveMemberId) {
        throw new Error('Medical profile query missing context.');
      }
      const result = await fetchMedicalProfileData(secure, effectiveMemberId, organisationId);
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
