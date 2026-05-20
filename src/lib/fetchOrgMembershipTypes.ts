import { createOrganisationId, err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { OrganisationId } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import type { OrgMembershipTypeOption } from '@/lib/memberRequestTypes';

type MembershipTypeRow = Database['public']['Tables']['core_membership_type']['Row'];

function ageFromDob(dob: string | null, asOf: Date = new Date()): number | null {
  if (dob == null || dob.trim() === '') return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = asOf.getFullYear() - d.getFullYear();
  const m = asOf.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) {
    age -= 1;
  }
  return age;
}

/** PR22 — age eligibility against `core_membership_type.min_age` / `max_age`. */
export function filterMembershipTypesByAge(
  dob: string | null,
  types: OrgMembershipTypeOption[],
  asOf: Date = new Date()
): OrgMembershipTypeOption[] {
  const age = ageFromDob(dob, asOf);
  if (age == null) {
    return types.filter((t) => t.minAge == null && t.maxAge == null);
  }
  return types.filter((t) => {
    if (t.minAge != null && age < t.minAge) return false;
    if (t.maxAge != null && age > t.maxAge) return false;
    return true;
  });
}

function mapRow(row: MembershipTypeRow): OrgMembershipTypeOption {
  return {
    id: row.id,
    name: row.name?.trim() ?? 'Membership',
    minAge: row.min_age,
    maxAge: row.max_age,
    organisationId: createOrganisationId(row.organisation_id ?? ''),
  };
}

export async function fetchOrgMembershipTypes(
  client: SupabaseClient<Database>,
  organisationId: OrganisationId
): Promise<ApiResult<OrgMembershipTypeOption[]>> {
  const orgId = organisationId.trim();
  if (!orgId) {
    return err({ code: 'MEMBERSHIP_TYPES_ORG', message: 'Organisation is required.' });
  }

  const { data, error } = await client
    .from('core_membership_type')
    .select('id, name, min_age, max_age, organisation_id, is_active')
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return err({
      code: 'MEMBERSHIP_TYPES_QUERY',
      message: error.message ?? 'Could not load membership types.',
    });
  }

  return ok((data ?? []).map((row) => mapRow(row as MembershipTypeRow)));
}
