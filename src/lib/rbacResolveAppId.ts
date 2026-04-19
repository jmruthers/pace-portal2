import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_NAME } from '@/constants';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Resolves the RBAC app UUID for {@link APP_NAME}, matching {@link useResolvedAppId}.
 * Used by {@link setupRBAC} `getAppId` so permission checks pass `p_app_id` to `rbac_check_permission_simplified`.
 */
export async function resolveRbacAppIdForSetup(
  client: SupabaseClient,
  appName: string
): Promise<string | null> {
  if (!isSupabaseConfigured || appName !== APP_NAME) return null;
  if (typeof client.auth?.getSession !== 'function' || typeof client.rpc !== 'function') {
    return null;
  }
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;
  const r = (await client.rpc('data_app_resolve', {
    p_app_name: appName,
    p_user_id: userId,
  })) as { data: unknown; error: Error | null };
  if (r.error) return null;
  const rows = r.data as { app_id: string }[] | null;
  return rows?.[0]?.app_id ?? null;
}
