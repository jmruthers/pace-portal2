import { createOrganisationId, err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { deriveMembershipDisplayState } from '@/lib/deriveMembershipDisplayState';
import type { MembershipListItem } from '@/lib/memberRequestTypes';

type MemberRow = Database['public']['Tables']['core_member']['Row'];
type RequestRow = {
  id: string;
  status: Database['public']['Enums']['team_member_request_status'];
  created_at: string;
  subject_member_id: string | null;
  target_organisation_id: string | null;
};

export async function fetchMembershipList(
  client: SupabaseClient<Database>,
  userId: string
): Promise<ApiResult<MembershipListItem[]>> {
  const uid = userId.trim();
  if (!uid) {
    return err({ code: 'MEMBERSHIP_LIST_USER', message: 'Sign in is required.' });
  }

  const personRes = await client
    .from('core_person')
    .select('id')
    .eq('user_id', uid)
    .maybeSingle();

  if (personRes.error) {
    return err({
      code: 'MEMBERSHIP_LIST_PERSON',
      message: personRes.error.message ?? 'Could not load your profile.',
    });
  }

  const personId = personRes.data?.id;
  if (!personId) {
    return ok([]);
  }

  const membersRes = await client
    .from('core_member')
    .select(
      `
      id,
      organisation_id,
      membership_status,
      membership_type_id,
      membership_number,
      core_organisations (
        id,
        name,
        display_name
      ),
      core_membership_type (
        id,
        name
      )
    `
    )
    .eq('person_id', personId)
    .order('created_at', { ascending: false });

  if (membersRes.error) {
    return err({
      code: 'MEMBERSHIP_LIST_MEMBERS',
      message: membersRes.error.message ?? 'Could not load memberships.',
    });
  }

  const members = (membersRes.data ?? []) as Array<
    MemberRow & {
      core_organisations:
        | { id: string; name: string | null; display_name: string | null }
        | { id: string; name: string | null; display_name: string | null }[]
        | null;
      core_membership_type: { id: number; name: string | null } | { id: number; name: string | null }[] | null;
    }
  >;

  const memberIds = members.map((m) => m.id).filter(Boolean);
  const requestsByMemberId = new Map<string, RequestRow>();

  if (memberIds.length > 0) {
    const reqRes = await client
      .from('team_member_request')
      .select('id, status, created_at, subject_member_id, target_organisation_id')
      .in('subject_member_id', memberIds)
      .order('created_at', { ascending: false });

    if (reqRes.error) {
      return err({
        code: 'MEMBERSHIP_LIST_REQUESTS',
        message: reqRes.error.message ?? 'Could not load membership requests.',
      });
    }

    const rows = (reqRes.data ?? []) as RequestRow[];
    const pendingStatuses = new Set(['pending', 'on_hold']);
    for (const row of rows) {
      const mid = row.subject_member_id;
      if (!mid) continue;
      const existing = requestsByMemberId.get(mid);
      if (!existing) {
        requestsByMemberId.set(mid, row);
        continue;
      }
      const rowIsPending = pendingStatuses.has(row.status);
      const existingIsPending = pendingStatuses.has(existing.status);
      if (rowIsPending && !existingIsPending) {
        requestsByMemberId.set(mid, row);
      }
    }
  }

  const items: MembershipListItem[] = members.map((m) => {
    const orgEmbed = m.core_organisations;
    const org = Array.isArray(orgEmbed) ? orgEmbed[0] : orgEmbed;
    const orgName =
      org?.display_name?.trim() || org?.name?.trim() || 'Organisation';

    const typeEmbed = m.core_membership_type;
    const typeRow = Array.isArray(typeEmbed) ? typeEmbed[0] : typeEmbed;

    const req = requestsByMemberId.get(m.id) ?? null;
    const derived = deriveMembershipDisplayState({
      membershipStatus: m.membership_status,
      requestStatus: req?.status ?? null,
    });

    return {
      memberId: m.id,
      organisationId: createOrganisationId(m.organisation_id ?? ''),
      organisationName: orgName,
      membershipStatus: m.membership_status ?? '',
      membershipTypeId: m.membership_type_id,
      membershipTypeName: typeRow?.name?.trim() ?? null,
      membershipNumber: m.membership_number?.trim() ?? null,
      requestId: req?.id ?? null,
      requestStatus: req?.status ?? null,
      requestSubmittedAt: req?.created_at ?? null,
      displayKind: derived.displayKind,
      displayLabel: derived.displayLabel,
      showApplyAgain: derived.showApplyAgain,
    };
  });

  return ok(items);
}

/** Pending/on-hold requests for duplicate pre-submit guard (includes rows without member yet). */
export async function fetchPendingMemberRequests(
  client: SupabaseClient<Database>,
  personId: string
): Promise<ApiResult<Array<{ targetOrganisationId: string; status: string }>>> {
  const { data, error } = await client
    .from('team_member_request')
    .select('target_organisation_id, status')
    .eq('subject_person_id', personId)
    .in('status', ['pending', 'on_hold']);

  if (error) {
    return err({
      code: 'PENDING_REQUESTS_QUERY',
      message: error.message ?? 'Could not verify existing requests.',
    });
  }

  return ok(
    (data ?? [])
      .map((r) => ({
        targetOrganisationId: String(
          (r as { target_organisation_id: string | null }).target_organisation_id ?? ''
        ),
        status: String((r as { status: string }).status ?? ''),
      }))
      .filter((r) => r.targetOrganisationId.length > 0)
  );
}
