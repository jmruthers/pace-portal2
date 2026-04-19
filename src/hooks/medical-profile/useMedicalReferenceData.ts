import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { useReferenceData } from '@/shared/hooks/useReferenceData';
import { fetchActiveCakeDietTypes, type CakeDietTypeRow } from '@/hooks/medical-profile/cakeDietTypes';

/**
 * PR09 — shared reference seam for the medical summary: member reference lookups + active cake diet types.
 */
export function useMedicalReferenceData() {
  const ref = useReferenceData();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const dietQuery = useQuery({
    queryKey: ['cakeDietTypes', 'active', 'v1'],
    enabled: Boolean(client),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      if (!client) {
        throw new Error('Diet types require an authenticated client.');
      }
      return fetchActiveCakeDietTypes(client);
    },
  });

  const dietTypes: CakeDietTypeRow[] | undefined =
    dietQuery.data && isOk(dietQuery.data) ? dietQuery.data.data : undefined;
  const dietApiError = dietQuery.data && !isOk(dietQuery.data) ? dietQuery.data.error : null;

  return {
    ...ref,
    dietTypes,
    dietTypesLoading: dietQuery.isLoading,
    dietTypesError:
      dietApiError != null
        ? new Error(dietApiError.message)
        : dietQuery.error instanceof Error
          ? dietQuery.error
          : null,
    dietTypesIsError: Boolean(dietApiError) || dietQuery.isError,
  };
}
