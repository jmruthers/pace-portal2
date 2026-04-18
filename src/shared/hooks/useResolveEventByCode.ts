import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { isOk } from '@solvera/pace-core/types';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
// Event RPC helpers are defined alongside the bootstrap client (public `data_event_get_by_code`).
// eslint-disable-next-line pace-core-compliance/no-base-supabase-import-outside-bootstrap -- see PR01 event slug resolution
import { fetchEventExistsWithCaseFallback, hasSupabaseBrowserConfig } from '@/lib/supabase';
import { isReservedEventSlug } from '@/routing/eventFormPaths';

export type ResolveEventByCodeStatus = 'loading' | 'found' | 'missing' | 'error';

/**
 * Resolves whether an event exists for the URL segment (PR01).
 * Uses `data_event_get_by_code` so visibility matches server rules (anon vs authenticated + org context).
 */
export function useResolveEventByCode(eventCode: string | undefined): ResolveEventByCodeStatus {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;

  const enabled =
    Boolean(eventCode && !isReservedEventSlug(eventCode)) && hasSupabaseBrowserConfig();

  const query = useQuery({
    queryKey: ['eventByCode', eventCode, user?.id ?? 'anon', organisationId],
    enabled,
    queryFn: async () => {
      if (!eventCode) return false;
      const result = await fetchEventExistsWithCaseFallback(
        eventCode,
        user?.id ?? null,
        organisationId
      );
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  if (!eventCode || isReservedEventSlug(eventCode)) {
    return 'missing';
  }

  if (!hasSupabaseBrowserConfig()) {
    return 'error';
  }

  if (query.isLoading || query.isFetching) {
    return 'loading';
  }

  if (query.isError) {
    return 'error';
  }

  return query.data ? 'found' : 'missing';
}
