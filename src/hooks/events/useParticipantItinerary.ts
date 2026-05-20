import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { fetchParticipantItinerary } from '@/lib/fetchParticipantItinerary';
import { deriveParticipantItinerary } from '@/lib/mapParticipantItineraryToCr26';
import type { ParticipantItineraryDerived } from '@/lib/participantItineraryContracts';
import { toItinerarySupabase } from '@/lib/participantItineraryDatabase';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { fetchParticipantApplication } from '@/lib/fetchParticipantBookings';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { fetchCurrentPersonMember, NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

export type ParticipantItineraryPhase =
  | 'loading_context'
  | 'loading'
  | 'ready'
  | 'ready_empty'
  | 'access_denied'
  | 'error'
  | 'not_found'
  | 'reserved'
  | 'needs_profile'
  | 'not_scoped';

export type ParticipantItineraryDataReady = {
  event: Database['public']['Tables']['core_events']['Row'];
  applicationId: string;
  itinerary: ParticipantItineraryDerived;
};

export type UseParticipantItineraryResult = {
  phase: ParticipantItineraryPhase;
  data: ParticipantItineraryDataReady | undefined;
  errorMessage: string | null;
  notFound: boolean;
  reservedSlug: boolean;
  refetch: () => Promise<unknown[]>;
};

/* eslint-disable complexity -- PR21: event, person, application, and itinerary queries share one surface. */
export function useParticipantItinerary(eventSlugRaw: string | undefined): UseParticipantItineraryResult {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const itineraryClient = toItinerarySupabase(secure);

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
  const routingReady =
    Boolean(slug.length > 0 && client && itineraryClient && userId && organisationId && orgIds.length > 0 && !reserved);

  const eventQuery = useQuery({
    queryKey: ['participantItinerary', 'event', 'v1', userId, organisationId, orgIds.join(','), slug],
    enabled: routingReady,
    staleTime: 30_000,
    queryFn: async () => lookupEventRowBySlug(client!, slug, orgIds),
  });

  const eventRow = eventQuery.data && isOk(eventQuery.data) ? eventQuery.data.data : undefined;

  const personQuery = useQuery({
    queryKey: ['participantItinerary', 'person', 'v1', userId, organisationId],
    enabled: Boolean(routingReady && eventRow?.event_id),
    staleTime: 30_000,
    queryFn: async () => fetchCurrentPersonMember(secure, userId!, organisationId!),
  });

  const personOk = personQuery.data && isOk(personQuery.data) ? personQuery.data.data : undefined;
  const personId = personOk?.person.id ?? null;

  const applicationQuery = useQuery({
    queryKey: ['participantItinerary', 'application', 'v1', personId, eventRow?.event_id],
    enabled: Boolean(routingReady && eventRow?.event_id && personId),
    staleTime: 15_000,
    queryFn: async () => fetchParticipantApplication(client!, personId!, eventRow!.event_id),
  });

  const application =
    applicationQuery.data && isOk(applicationQuery.data) ? applicationQuery.data.data : undefined;

  const itineraryQuery = useQuery({
    queryKey: ['participantItinerary', 'rows', 'v1', application?.id, eventRow?.event_id],
    enabled: Boolean(routingReady && application?.id && eventRow?.event_id),
    staleTime: 15_000,
    queryFn: async () =>
      fetchParticipantItinerary(itineraryClient!, application!.id, eventRow!.event_id),
  });

  const refetch = useCallback(async () => {
    return Promise.all([
      eventQuery.refetch(),
      personQuery.refetch(),
      applicationQuery.refetch(),
      itineraryQuery.refetch(),
    ]);
  }, [eventQuery, personQuery, applicationQuery, itineraryQuery]);

  const derived = useMemo(() => {
    if (!itineraryQuery.data || !isOk(itineraryQuery.data)) return undefined;
    return deriveParticipantItinerary(itineraryQuery.data.data);
  }, [itineraryQuery.data]);

  const base = {
    data: undefined as ParticipantItineraryDataReady | undefined,
    errorMessage: null as string | null,
    notFound: false,
    reservedSlug: reserved,
    refetch,
  };

  if (reserved) {
    return { ...base, phase: 'reserved' };
  }

  if (slug === '') {
    return { ...base, phase: 'not_found', notFound: true };
  }

  if (!client || !itineraryClient || !userId || !organisationId || orgIds.length === 0) {
    return { ...base, phase: 'loading_context' };
  }

  if (eventQuery.isLoading) {
    return { ...base, phase: 'loading' };
  }

  if (eventQuery.data != null && !isOk(eventQuery.data)) {
    const e = eventQuery.data.error;
    if (e.code === 'EVENT_NOT_FOUND') {
      return { ...base, phase: 'not_found', notFound: true };
    }
    return { ...base, phase: 'error', errorMessage: e.message ?? 'Could not load event.' };
  }

  if (!eventRow) {
    return { ...base, phase: 'not_found', notFound: true };
  }

  if (personQuery.isLoading) {
    return { ...base, phase: 'loading' };
  }

  if (personQuery.data != null && !isOk(personQuery.data)) {
    if (personQuery.data.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
      return { ...base, phase: 'needs_profile' };
    }
    return {
      ...base,
      phase: 'error',
      errorMessage: personQuery.data.error.message ?? 'Could not load profile.',
    };
  }

  if (applicationQuery.isLoading) {
    return { ...base, phase: 'loading' };
  }

  if (applicationQuery.data != null && !isOk(applicationQuery.data)) {
    return {
      ...base,
      phase: 'error',
      errorMessage: applicationQuery.data.error.message ?? 'Could not load application.',
    };
  }

  if (application == null) {
    return { ...base, phase: 'not_scoped' };
  }

  if (itineraryQuery.isLoading) {
    return { ...base, phase: 'loading' };
  }

  if (itineraryQuery.data != null && !isOk(itineraryQuery.data)) {
    const code = itineraryQuery.data.error.code ?? '';
    if (code.includes('PERMISSION') || code.includes('RLS') || code.includes('DENIED')) {
      return { ...base, phase: 'access_denied' };
    }
    return {
      ...base,
      phase: 'error',
      errorMessage: itineraryQuery.data.error.message ?? 'Could not load itinerary.',
    };
  }

  if (!derived) {
    return { ...base, phase: 'loading' };
  }

  if (derived.days.length === 0) {
    return { ...base, phase: 'ready_empty' };
  }

  return {
    ...base,
    phase: 'ready',
    data: {
      event: eventRow,
      applicationId: application.id,
      itinerary: derived,
    },
  };
}
