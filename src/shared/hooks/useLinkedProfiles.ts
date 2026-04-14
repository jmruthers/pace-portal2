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
};

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
      return (rows ?? []) as LinkedProfileRow[];
    },
  });
}
