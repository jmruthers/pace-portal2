import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type ReferenceDataBundle = {
  phoneTypes: Database['public']['Tables']['core_phone_type']['Row'][];
  membershipTypes: Database['public']['Tables']['core_membership_type']['Row'][];
  genderTypes: Database['public']['Tables']['core_gender_type']['Row'][];
  pronounTypes: Database['public']['Tables']['core_pronoun_type']['Row'][];
};

/** Requirement name for PR06 / wizard docs; same shape as {@link ReferenceDataBundle}. */
export type MemberProfileReferenceData = ReferenceDataBundle;

/** Exported for tests — loads all reference tables in parallel. */
export async function fetchReferenceDataBundle(
  client: SupabaseClient<Database>
): Promise<ApiResult<ReferenceDataBundle>> {
  try {
    const [phoneTypes, membershipTypes, genderTypes, pronounTypes] = await Promise.all([
      client.from('core_phone_type').select('*'),
      client.from('core_membership_type').select('*'),
      client.from('core_gender_type').select('*'),
      client.from('core_pronoun_type').select('*'),
    ]);

    const firstError =
      phoneTypes.error ?? membershipTypes.error ?? genderTypes.error ?? pronounTypes.error;
    if (firstError) {
      return err({
        code: 'REFERENCE_DATA',
        message: firstError.message || 'Could not load reference data.',
      });
    }

    return ok({
      phoneTypes: phoneTypes.data ?? [],
      membershipTypes: membershipTypes.data ?? [],
      genderTypes: genderTypes.data ?? [],
      pronounTypes: pronounTypes.data ?? [],
    });
  } catch (e) {
    return err(
      normalizeToApiError(e, 'REFERENCE_DATA', 'Could not load reference data.')
    );
  }
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
      const result = await fetchReferenceDataBundle(db);
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
