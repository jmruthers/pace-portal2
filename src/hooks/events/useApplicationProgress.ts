import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { validateUuid } from '@/shared/lib/utils/inputValidation';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import { fetchApplicationProgress } from '@/lib/fetchApplicationProgress';
import type { ApplicationProgressPayload } from '@/lib/applicationProgressContracts';

export type ApplicationProgressPhase =
  /** Session or shell context missing (caller should redirect or gate). */
  | 'loading_context'
  /** `applicationId` route param fails UUID syntax — no RPC calls. */
  | 'invalid_id'
  /** Event slug or RPC in flight */
  | 'loading'
  | 'ready'
  /** Applicant denial, wrong-event URL, or post-success event mismatch — same UX. */
  | 'access_denied'
  /** Transient RPC or unexpected failure */
  | 'error'
  /** Event slug did not resolve in org scope */
  | 'not_found'
  /** First path segment clashes with portal reserved routes */
  | 'reserved';

export type ApplicationProgressDataReady = {
  event: Database['public']['Tables']['core_events']['Row'];
  progress: ApplicationProgressPayload;
};

export type UseApplicationProgressResult = {
  phase: ApplicationProgressPhase;
  data: ApplicationProgressDataReady | undefined;
  errorMessage: string | null;
  notFound: boolean;
  reservedSlug: boolean;
  refetch: () => Promise<[unknown, unknown]>;
};

/**
 * Participant application progress orchestration (`/:eventSlug/applications/:applicationId`, PR18 / BA05b).
 */
export function useApplicationProgress(
  eventSlugRaw: string | undefined,
  applicationIdRaw: string | undefined
): UseApplicationProgressResult {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const accessibleOrganisationIds = useMemo(
    () => (org?.organisations ?? []).map((o) => o.id).filter(Boolean),
    [org?.organisations]
  );
  const orgIds =
    accessibleOrganisationIds.length > 0 ? accessibleOrganisationIds : organisationId ? [organisationId] : [];

  const slug = eventSlugRaw?.trim() ?? '';
  const reserved = slug.length > 0 && isReservedEventSlug(slug);

  const uuidResult = validateUuid(applicationIdRaw);
  const uuidOk = isOk(uuidResult);
  const applicationIdNormalized = uuidOk ? uuidResult.data : null;

  const routingReady = Boolean(slug.length > 0 && client && userId && organisationId && orgIds.length > 0);
  const canLoadEvent =
    routingReady &&
    uuidOk &&
    applicationIdNormalized != null &&
    !reserved;

  const eventQuery = useQuery({
    queryKey: ['applicationProgress', 'event', 'v1', userId, organisationId, orgIds.join(','), slug],
    enabled: canLoadEvent,
    staleTime: 30_000,
    queryFn: async () => lookupEventRowBySlug(client!, slug, orgIds),
  });

  const eventRow =
    eventQuery.data && isOk(eventQuery.data) ? eventQuery.data.data : undefined;

  const progressQuery = useQuery({
    queryKey: ['applicationProgress', 'rpc', 'v1', userId, applicationIdNormalized ?? ''],
    enabled: Boolean(canLoadEvent && eventRow?.event_id),
    staleTime: 15_000,
    queryFn: async () =>
      fetchApplicationProgress(client!, applicationIdNormalized ?? ''),
  });

  const progressOk =
    progressQuery.data && isOk(progressQuery.data) ? progressQuery.data.data : undefined;
  const eventMismatch =
    progressOk != null && eventRow != null && progressOk.application.event_id !== eventRow.event_id;

  const refetch = useCallback(
    async () => Promise.all([eventQuery.refetch(), progressQuery.refetch()] as [unknown, unknown]),
    [eventQuery, progressQuery]
  );

  return useMemo((): UseApplicationProgressResult => {
    const base = {
      data: undefined as ApplicationProgressDataReady | undefined,
      errorMessage: null as string | null,
      notFound: false,
      reservedSlug: reserved,
      refetch,
    };

    if (reserved) {
      return { ...base, phase: 'reserved' as const };
    }

    if (slug === '') {
      return { ...base, phase: 'not_found', notFound: true };
    }

    if (!uuidOk) {
      return {
        ...base,
        phase: 'invalid_id',
        reservedSlug: false,
      };
    }

    if (!client || !userId || !organisationId || orgIds.length === 0) {
      return {
        ...base,
        phase: 'loading_context',
        reservedSlug: false,
      };
    }

    if (eventQuery.isLoading || eventQuery.isFetching) {
      return { ...base, phase: 'loading', reservedSlug: false };
    }

    if (eventQuery.data != null && !isOk(eventQuery.data)) {
      const e = eventQuery.data.error;
      if (e.code === 'EVENT_NOT_FOUND') {
        return { ...base, phase: 'not_found', notFound: true, reservedSlug: false };
      }
      return {
        ...base,
        phase: 'error',
        errorMessage: e.message ?? 'Could not load event.',
        reservedSlug: false,
      };
    }

    if (!eventRow) {
      return { ...base, phase: 'not_found', notFound: true, reservedSlug: false };
    }

    if (progressQuery.isLoading || progressQuery.isFetching) {
      return { ...base, phase: 'loading', reservedSlug: false };
    }

    const pr = progressQuery.data;
    if (pr != null && !isOk(pr)) {
      if (pr.error.code === 'APPLICATION_PROGRESS_ACCESS_DENIED') {
        return {
          ...base,
          phase: 'access_denied',
          errorMessage: pr.error.message,
          reservedSlug: false,
        };
      }
      return {
        ...base,
        phase: 'error',
        errorMessage: pr.error.message ?? 'Could not load application progress.',
        reservedSlug: false,
      };
    }

    if (progressOk == null || !eventRow) {
      return {
        ...base,
        phase: 'error',
        errorMessage: 'Could not load application progress.',
        reservedSlug: false,
      };
    }

    if (eventMismatch) {
      return {
        ...base,
        phase: 'access_denied',
        errorMessage: 'You cannot view this application.',
        reservedSlug: false,
      };
    }

    return {
      phase: 'ready',
      data: { event: eventRow, progress: progressOk },
      errorMessage: null,
      notFound: false,
      reservedSlug: false,
      refetch,
    };
  }, [
    slug,
    reserved,
    uuidOk,
    client,
    userId,
    organisationId,
    orgIds.length,
    refetch,
    eventQuery.isLoading,
    eventQuery.isFetching,
    eventQuery.data,
    eventRow,
    progressQuery.isLoading,
    progressQuery.isFetching,
    progressQuery.data,
    progressOk,
    eventMismatch,
  ]);
}
