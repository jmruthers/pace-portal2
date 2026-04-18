import type { SupabaseClient } from '@supabase/supabase-js';
import { err, normalizeToApiError, ok, type ApiResult } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';

/** Active row from `public.cake_diettype` (portal medical dietary select). */
export type CakeDietTypeRow = {
  diettype_id: string;
  diettype_code: string;
  diettype_name: string;
  diettype_description: string | null;
};

/**
 * Loads globally active diet types for the medical profile menu select.
 * Table may be absent from generated `Database` typings; query is still valid at runtime.
 */
export async function fetchActiveCakeDietTypes(
  client: SupabaseClient<Database>
): Promise<ApiResult<CakeDietTypeRow[]>> {
  try {
    const res = await client
      .from('cake_diettype')
      .select('diettype_id,diettype_code,diettype_name,diettype_description')
      .eq('is_active', true)
      .order('diettype_name', { ascending: true });
    if (res.error) {
      return err({
        code: 'CAKE_DIET_TYPES',
        message: res.error.message || 'Could not load diet types.',
      });
    }
    return ok((res.data ?? []) as CakeDietTypeRow[]);
  } catch (e) {
    return err(normalizeToApiError(e, 'CAKE_DIET_TYPES', 'Could not load diet types.'));
  }
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a row from `cake_diettype` for the current form value.
 * Handles case differences and UUID-stored FKs where `cake_diettype.diettype_id` is a short numeric string.
 */
export function findDietTypeById(
  rows: readonly CakeDietTypeRow[] | undefined,
  diettypeId: string | null | undefined
): CakeDietTypeRow | undefined {
  const id = diettypeId?.trim();
  if (!id || !rows?.length) return undefined;

  const lower = id.toLowerCase();
  const exact = rows.find((r) => {
    const rid = r.diettype_id.trim();
    return rid === id || rid.toLowerCase() === lower;
  });
  if (exact) return exact;

  if (UUID_LIKE.test(id)) {
    const lastSeg = id.split('-').pop() ?? '';
    const n = parseInt(lastSeg, 10);
    if (!Number.isNaN(n) && n > 0) {
      const byDecimal = rows.find((r) => r.diettype_id.trim() === String(n));
      if (byDecimal) return byDecimal;
    }
  }

  return undefined;
}
