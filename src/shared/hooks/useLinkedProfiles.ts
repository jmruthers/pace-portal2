import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/pace-database';

export type LinkedProfileRow = {
  person_id: string;
  first_name: string;
  last_name: string;
  organisation_name: string;
  permission_type: string;
  /** Resolved `core_member.id` for navigation (enriched when missing from RPC). */
  member_id?: string;
  organisation_id?: string;
};

function parseLinkedProfileRows(rows: unknown): LinkedProfileRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      person_id: String(r.person_id ?? ''),
      first_name: String(r.first_name ?? ''),
      last_name: String(r.last_name ?? ''),
      organisation_name: String(r.organisation_name ?? ''),
      permission_type: String(r.permission_type ?? ''),
      member_id: r.member_id != null ? String(r.member_id) : undefined,
      organisation_id: r.organisation_id != null ? String(r.organisation_id) : undefined,
    };
  });
}

/**
 * Resolves `member_id` via `core_member` when the RPC omits it (match `person_id` + `organisation_id`, or single row per person).
 */
export async function enrichLinkedProfilesWithMemberIds(
  client: SupabaseClient<Database>,
  rows: LinkedProfileRow[]
): Promise<LinkedProfileRow[]> {
  if (rows.length === 0) return rows;
  if (rows.every((row) => Boolean(row.member_id))) return rows;

  const personIds = [...new Set(rows.filter((r) => !r.member_id).map((r) => r.person_id))];
  if (personIds.length === 0) return rows;

  const { data: members, error } = await client
    .from('core_member')
    .select('id, person_id, organisation_id')
    .in('person_id', personIds);

  if (error || !members?.length) {
    return rows;
  }

  return rows.map((row) => {
    if (row.member_id) return row;
    const candidates = members.filter((m) => m.person_id === row.person_id);
    if (candidates.length === 0) return row;
    if (row.organisation_id) {
      const hit = candidates.find((c) => c.organisation_id === row.organisation_id);
      return hit
        ? { ...row, member_id: hit.id, organisation_id: hit.organisation_id ?? row.organisation_id }
        : row;
    }
    if (candidates.length === 1) {
      const only = candidates[0];
      return {
        ...row,
        member_id: only.id,
        organisation_id: only.organisation_id ?? row.organisation_id,
      };
    }
    return row;
  });
}

/**
 * Delegated linked profiles for the signed-in user via `data_pace_linked_profiles_list`.
 * Uses the base authenticated Supabase client (not `useSecureSupabase()`): the secure client
 * runs `set_organisation_context` before every `rpc()`, which can yield 400 for this RPC;
 * legacy portal called the same function on the raw client.
 *
 * Waits until auth + session restoration finish so the JWT is attached before PostgREST runs
 * the RPC (avoids `auth.uid()`-dependent failures when the session is not ready yet).
 */
export function useLinkedProfiles() {
  const { user, supabase, session, isLoading: authLoading, sessionRestoration } =
    useUnifiedAuthContext();

  const sessionUserId = session?.user?.id ?? user?.id;
  const sessionReady =
    Boolean(isSupabaseConfigured && sessionUserId) &&
    !authLoading &&
    !sessionRestoration.isRestoring;

  return useQuery({
    queryKey: ['linkedProfiles', sessionUserId],
    enabled: sessionReady,
    /** PostgREST 4xx errors are not fixed by retry; default retry:3 also triples noisy 400s in DevTools. */
    retry: false,
    queryFn: async (): Promise<LinkedProfileRow[]> => {
      if (!isSupabaseConfigured || !sessionUserId) return [];
      const client = supabase as SupabaseClient<Database>;

      const { data: authSnap } = await client.auth.getSession();
      const uid = authSnap.session?.user?.id ?? sessionUserId;
      if (!uid) return [];

      const { data: rows, error: rpcError } = await client.rpc('data_pace_linked_profiles_list', {
        p_user_id: uid,
      });
      if (rpcError) throw rpcError;
      const parsed = parseLinkedProfileRows(rows);
      return enrichLinkedProfilesWithMemberIds(client, parsed);
    },
  });
}
