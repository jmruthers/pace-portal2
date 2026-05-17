/**
 * Base Supabase client for UnifiedAuthProvider only.
 * Components must use useSecureSupabase() from pace-core for queries.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set, a no-op placeholder
 * is exported so the app still runs (auth and org features will be inactive).
 *
 * `fetchEventExistsWithCaseFallback` is scoped here (bootstrap-only) because it uses this client
 * for `data_event_get_by_code` (PR01 event slug resolution).
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResult } from '@solvera/pace-core/types';
import { err, ok } from '@solvera/pace-core/types';

export function hasSupabaseBrowserConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  return Boolean(url && key);
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const hasConfig = hasSupabaseBrowserConfig();

export const supabaseClient: SupabaseClient = hasConfig
  ? createClient(supabaseUrl, supabasePublishableKey)
  : ({} as SupabaseClient);

async function lookupEventExistsOnce(
  eventCode: string,
  userId: string | null,
  organisationId: string | null
): Promise<ApiResult<boolean>> {
  const { data, error } = await supabaseClient.rpc('data_event_get_by_code', {
    p_event_code: eventCode,
    p_user_id: userId ?? undefined,
    p_organisation_id: organisationId ?? undefined,
  });

  if (error) {
    return err({
      code: 'EVENT_CODE_LOOKUP',
      message: typeof error.message === 'string' && error.message.length > 0 ? error.message : 'Event lookup failed.',
    });
  }

  const rows = Array.isArray(data) ? data : [];
  return ok(rows.length > 0);
}

/**
 * Returns whether an event exists for `data_event_get_by_code`, retrying once with an all-lowercase
 * code when the first call returns no rows (case-insensitive slug UX).
 */
export async function fetchEventExistsWithCaseFallback(
  eventCode: string,
  userId: string | null,
  organisationId: string | null
): Promise<ApiResult<boolean>> {
  if (!hasSupabaseBrowserConfig()) {
    return err({
      code: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase is not configured for this environment.',
    });
  }

  const first = await lookupEventExistsOnce(eventCode, userId, organisationId);
  if (!first.ok) {
    return first;
  }
  if (first.data) {
    return ok(true);
  }

  if (eventCode !== eventCode.toLowerCase()) {
    const second = await lookupEventExistsOnce(eventCode.toLowerCase(), userId, organisationId);
    if (!second.ok) {
      return second;
    }
    return ok(second.data);
  }

  return ok(false);
}
