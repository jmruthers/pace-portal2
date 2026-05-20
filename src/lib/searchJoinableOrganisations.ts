import { createOrganisationId, err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import type { JoinableOrganisation } from '@/lib/memberRequestTypes';

function parseJoinableRows(rows: unknown): JoinableOrganisation[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? '').trim();
      if (!id) return null;
      const name = String(r.name ?? r.display_name ?? '').trim();
      const displayName = String(r.display_name ?? r.name ?? '').trim();
      return {
        id: createOrganisationId(id),
        name: name || displayName || 'Organisation',
        displayName: displayName || name || 'Organisation',
      };
    })
    .filter((x): x is JoinableOrganisation => x != null);
}

/**
 * PR22 — Participant-safe org directory (`data_pace_joinable_organisations_search`).
 */
export async function searchJoinableOrganisations(
  client: SupabaseClient<Database>,
  query: string,
  limit = 20
): Promise<ApiResult<JoinableOrganisation[]>> {
  const q = query.trim();
  const { data, error } = await client.rpc('data_pace_joinable_organisations_search', {
    p_query: q.length > 0 ? q : undefined,
    p_limit: limit,
  });

  if (error) {
    return err({
      code: 'JOINABLE_ORG_SEARCH',
      message: error.message ?? 'Could not search organisations.',
    });
  }

  return ok(parseJoinableRows(data));
}
