import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { APP_NAME } from '@/constants';

/**
 * Resolves pace app id via `data_app_resolve` when auth context has no `appId` yet.
 */
export function useResolvedAppId() {
  const { user, appId: contextAppId } = useUnifiedAuthContext();
  const secure = useSecureSupabase();

  const { data: resolved } = useQuery({
    queryKey: ['data_app_resolve', APP_NAME, user?.id],
    enabled: Boolean(secure && user?.id && !contextAppId),
    queryFn: async () => {
      if (!secure || !user?.id) return null;
      const r = (await secure.rpc('data_app_resolve', {
        p_app_name: APP_NAME,
        p_user_id: user.id,
      })) as { data: unknown; error: Error | null };
      if (r.error) throw r.error;
      const rows = r.data as { app_id: string }[] | null;
      return rows?.[0]?.app_id ?? null;
    },
  });

  return contextAppId ?? resolved ?? '';
}
