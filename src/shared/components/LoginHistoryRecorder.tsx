import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContext } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { recordLogin, type SupabaseClientWithFunctions } from '@solvera/pace-core/login-history';
import { APP_NAME } from '@/constants';

/**
 * Records login history once per Supabase auth session via pace-core (not page-local).
 * Renders nothing.
 */
export function LoginHistoryRecorder() {
  const { user, supabase } = useUnifiedAuthContext();
  const orgCtx = useOrganisationsContext();
  const secure = useSecureSupabase();
  const recordedForSessionId = useRef<string | null>(null);
  const base = supabase as SupabaseClient | null;

  useEffect(() => {
    if (!user?.id || !secure || !base?.auth || orgCtx.isLoading) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await base.auth.getSession();
      const authSession = data.session as { id?: string } | null;
      const sessionId = authSession?.id;
      if (cancelled || !sessionId || !user?.id) {
        return;
      }
      if (recordedForSessionId.current === sessionId) {
        return;
      }
      recordedForSessionId.current = sessionId;

      let appId: string | null = null;
      try {
        const resolved = (await secure.rpc('data_app_resolve', {
          p_app_name: APP_NAME,
          p_user_id: user.id,
        })) as { data: { app_id: string }[] | null; error: unknown };
        if (!resolved.error && resolved.data?.[0]?.app_id) {
          appId = resolved.data[0].app_id;
        }
      } catch (e: unknown) {
        if (import.meta.env.DEV) console.warn('pace-portal: data_app_resolve failed', e);
      }

      const result = await recordLogin(secure as unknown as SupabaseClientWithFunctions, {
        user_id: user.id,
        session_id: sessionId,
        organisation_id: orgCtx.selectedOrganisation?.id ?? null,
        app_id: appId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });

      if (!result.ok) {
        console.warn('[LoginHistoryRecorder]', result.error.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [base, orgCtx.isLoading, orgCtx.selectedOrganisation?.id, secure, user?.id]);

  useEffect(() => {
    if (!user) {
      recordedForSessionId.current = null;
    }
  }, [user]);

  return null;
}
