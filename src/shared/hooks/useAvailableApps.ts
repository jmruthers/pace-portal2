import { useQuery } from '@tanstack/react-query';
import type { AppSwitcherItem } from '@solvera/pace-core/components';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isSupabaseConfigured } from '@/lib/env';
import { buildAppSwitcherHref } from '@/shared/hooks/appSwitcherHref';

type RbacAppRow = {
  id: string;
  name: string;
  display_name: string;
  is_active?: boolean;
};

/**
 * Apps the signed-in user may open in the suite (via `data_rbac_apps_list`).
 */
export function useAvailableApps() {
  const { user, isAuthenticated } = useUnifiedAuthContext();
  const secureClient = useSecureSupabase();

  return useQuery({
    queryKey: ['data_rbac_apps_list', user?.id],
    enabled: isSupabaseConfigured && isAuthenticated && Boolean(user?.id) && secureClient != null,
    queryFn: async (): Promise<AppSwitcherItem[]> => {
      const uid = user?.id;
      if (uid == null || uid === '' || secureClient == null) {
        return [];
      }
      const { data, error } = (await secureClient.rpc('data_rbac_apps_list', {
        p_user_id: uid,
      })) as { data: unknown; error: { message: string } | null };
      if (error) {
        throw error;
      }
      const rows = (data ?? []) as RbacAppRow[];
      return rows
        .filter((r) => r.is_active !== false)
        .map((row) => {
          const slug = String(row.name ?? '').toLowerCase();
          return {
            id: slug,
            label: row.display_name?.trim() !== '' ? row.display_name : slug.toUpperCase(),
            href: buildAppSwitcherHref(slug),
          };
        });
    },
  });
}
