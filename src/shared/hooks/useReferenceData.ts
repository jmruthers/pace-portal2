import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type ReferenceDataBundle = {
  phoneTypes: Database['public']['Tables']['core_phone_type']['Row'][];
  membershipTypes: Database['public']['Tables']['core_membership_type']['Row'][];
  genderTypes: Database['public']['Tables']['core_gender_type']['Row'][];
  pronounTypes: Database['public']['Tables']['core_pronoun_type']['Row'][];
};

/** Exported for tests — loads all reference tables in parallel. */
export async function fetchReferenceDataBundle(
  client: SupabaseClient<Database>
): Promise<ReferenceDataBundle> {
  const [phoneTypes, membershipTypes, genderTypes, pronounTypes] = await Promise.all([
    client.from('core_phone_type').select('*'),
    client.from('core_membership_type').select('*'),
    client.from('core_gender_type').select('*'),
    client.from('core_pronoun_type').select('*'),
  ]);

  const firstError =
    phoneTypes.error ?? membershipTypes.error ?? genderTypes.error ?? pronounTypes.error;
  if (firstError) {
    throw firstError;
  }

  return {
    phoneTypes: phoneTypes.data ?? [],
    membershipTypes: membershipTypes.data ?? [],
    genderTypes: genderTypes.data ?? [],
    pronounTypes: pronounTypes.data ?? [],
  };
}

/**
 * Loads reference lookup tables in parallel and caches them for the session (TanStack Query infinite stale time).
 */
export function useReferenceData() {
  const secure = useSecureSupabase();
  const db = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['referenceData', 'v1'],
    enabled: Boolean(db),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<ReferenceDataBundle> => {
      if (!db) {
        throw new Error('Reference data requires an authenticated client.');
      }
      return fetchReferenceDataBundle(db);
    },
  });
}
