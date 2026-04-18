/**
 * Base Supabase client for UnifiedAuthProvider only.
 * Components must use useSecureSupabase() from pace-core for queries.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set, a no-op placeholder
 * is exported so the app still runs (auth and org features will be inactive).
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const hasConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabaseClient: SupabaseClient = hasConfig
  ? createClient(supabaseUrl, supabasePublishableKey)
  : ({} as SupabaseClient);

/** True when Vite env has Supabase URL + publishable key (bootstrap client is real). */
export function hasSupabaseBrowserConfig(): boolean {
  return hasConfig;
}

async function fetchEventExistsByCode(
  eventCode: string,
  userId: string | null,
  organisationId: string | null
): Promise<ApiResult<boolean>> {
  if (!hasConfig) {
    return err({
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase is not configured.',
    });
  }
  const client = supabaseClient as SupabaseClient<Database>;
  const { data, error } = await client.rpc('data_event_get_by_code', {
    p_event_code: eventCode,
    p_user_id: userId ?? undefined,
    p_organisation_id: organisationId ?? undefined,
  });
  if (error) {
    return err({
      code: 'EVENT_CODE_LOOKUP',
      message: error.message || 'Event lookup failed.',
    });
  }
  return ok(Boolean(data?.length));
}

/**
 * Returns whether an event exists for `p_event_code` via `data_event_get_by_code`.
 * Retries once with a lowercase code when the original lookup returns no rows (mixed-case URLs).
 */
export async function fetchEventExistsWithCaseFallback(
  eventCode: string,
  userId: string | null,
  organisationId: string | null
): Promise<ApiResult<boolean>> {
  const first = await fetchEventExistsByCode(eventCode, userId, organisationId);
  if (!isOk(first)) return first;
  if (first.data) return first;
  if (eventCode !== eventCode.toLowerCase()) {
    return fetchEventExistsByCode(eventCode.toLowerCase(), userId, organisationId);
  }
  return first;
}
