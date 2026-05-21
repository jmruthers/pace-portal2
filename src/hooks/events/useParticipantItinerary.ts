import { useMemo } from 'react';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toItinerarySupabase } from '@/lib/participantItineraryDatabase';
import type { ParticipantItineraryDerived } from '@/lib/participantItineraryContracts';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { resolveParticipantItineraryPhase } from '@/hooks/events/resolveParticipantItineraryPhase';
import { useParticipantItineraryQueries } from '@/hooks/events/useParticipantItineraryQueries';

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
  const routingReady = Boolean(
    slug.length > 0 && client && itineraryClient && userId && organisationId && orgIds.length > 0 && !reserved
  );

  const queries = useParticipantItineraryQueries({
    client,
    itineraryClient,
    secure,
    userId,
    organisationId,
    orgIds,
    slug,
    routingReady,
  });

  return resolveParticipantItineraryPhase({
    reserved,
    slug,
    clientReady: Boolean(client),
    itineraryClientReady: Boolean(itineraryClient),
    userId,
    organisationId,
    orgIdsLength: orgIds.length,
    eventLoading: queries.eventQuery.isLoading,
    eventData: queries.eventQuery.data,
    eventRow: queries.eventRow,
    personLoading: queries.personQuery.isLoading,
    personData: queries.personQuery.data,
    applicationLoading: queries.applicationQuery.isLoading,
    applicationData: queries.applicationQuery.data,
    application: queries.application ?? undefined,
    itineraryLoading: queries.itineraryQuery.isLoading,
    itineraryData: queries.itineraryQuery.data,
    derived: queries.derived,
    refetch: queries.refetch,
  });
}
