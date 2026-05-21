import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { fetchParticipantItinerary } from '@/lib/fetchParticipantItinerary';
import { deriveParticipantItinerary } from '@/lib/mapParticipantItineraryToCr26';
import { fetchParticipantApplication } from '@/lib/fetchParticipantBookings';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';

export function useParticipantItineraryQueries(args: {
  client: SupabaseClient<Database> | null;
  itineraryClient: SupabaseClient<Database> | null;
  secure: ReturnType<typeof import('@solvera/pace-core/rbac').useSecureSupabase> | null;
  userId: string | null;
  organisationId: string | null;
  orgIds: string[];
  slug: string;
  routingReady: boolean;
}) {
  const { client, itineraryClient, secure, userId, organisationId, orgIds, slug, routingReady } = args;

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
    queryFn: async () => fetchCurrentPersonMember(secure!, userId!, organisationId!),
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

  return {
    eventQuery,
    personQuery,
    applicationQuery,
    itineraryQuery,
    eventRow,
    application,
    derived,
    refetch,
  };
}
