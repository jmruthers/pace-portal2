import { useMemo } from 'react';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import type { ApiResult } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { resolveActivityBookingPhase } from '@/hooks/events/resolveActivityBookingPhase';
import { useActivityBookingMutations } from '@/hooks/events/useActivityBookingMutations';
import { useActivityBookingQueries } from '@/hooks/events/useActivityBookingQueries';
import type {
  BookingValidationResult,
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
} from '@/lib/activityBookingTypes';

export type ActivityBookingPhase =
  | 'loading_context'
  | 'loading'
  | 'ready'
  | 'access_denied'
  | 'error'
  | 'not_found'
  | 'reserved'
  | 'needs_profile'
  | 'no_application'
  | 'not_approved';

export type ActivityBookingDataReady = {
  event: Database['public']['Tables']['core_events']['Row'];
  application: ParticipantApplicationContext;
  offerings: OfferingBrowseItem[];
  bookings: ParticipantBookingItem[];
};

export type UseActivityBookingResult = {
  phase: ActivityBookingPhase;
  data: ActivityBookingDataReady | undefined;
  errorMessage: string | null;
  notFound: boolean;
  reservedSlug: boolean;
  refetch: () => Promise<unknown[]>;
  validateSession: (sessionId: string) => BookingValidationResult | null;
  bookSession: (sessionId: string, consentAcknowledged: boolean) => Promise<ApiResult<void>>;
  cancelBooking: (bookingId: string) => Promise<ApiResult<void>>;
  bookPending: boolean;
  cancelPending: boolean;
  lastActionError: string | null;
  clearLastActionError: () => void;
};

export function useActivityBooking(eventSlugRaw: string | undefined): UseActivityBookingResult {
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
  const routingReady = Boolean(slug.length > 0 && client && userId && organisationId && orgIds.length > 0 && !reserved);

  const queries = useActivityBookingQueries({
    client,
    secure,
    userId,
    organisationId,
    orgIds,
    slug,
    routingReady,
  });

  const mutations = useActivityBookingMutations({
    client,
    eventRow: queries.eventRow,
    application: queries.application ?? undefined,
    offerings: queries.offerings,
    bookings: queries.bookings,
    personId: queries.personId,
    userId,
  });

  return useMemo(
    () =>
      resolveActivityBookingPhase({
        routing: { reserved, slug },
        auth: {
          client,
          userId,
          organisationId,
          orgIdsLength: orgIds.length,
        },
        mutations: {
          refetchAll: queries.refetchAll,
          validateSession: mutations.validateSession,
          bookSession: mutations.bookSession,
          cancelBooking: mutations.cancelBooking,
          bookPending: mutations.bookPending,
          cancelPending: mutations.cancelPending,
          lastActionError: mutations.lastActionError,
          clearLastActionError: mutations.clearLastActionError,
        },
        event: {
          loading: queries.eventQuery.isLoading || queries.eventQuery.isFetching,
          data: queries.eventQuery.data,
          row: queries.eventRow,
        },
        person: {
          loading: queries.personQuery.isLoading || queries.personQuery.isFetching,
          data: queries.personQuery.data,
          personId: queries.personId,
        },
        application: {
          loading: queries.applicationQuery.isLoading || queries.applicationQuery.isFetching,
          data: queries.applicationQuery.data,
          row: queries.application ?? undefined,
        },
        browse: {
          loading: queries.browseQuery.isLoading || queries.browseQuery.isFetching,
          data: queries.browseQuery.data,
          offerings: queries.offerings,
        },
        bookings: {
          loading: queries.bookingsQuery.isLoading || queries.bookingsQuery.isFetching,
          data: queries.bookingsQuery.data,
          bookings: queries.bookings,
        },
        waiver: {
          loading: queries.waiverConsentsQuery.isLoading || queries.waiverConsentsQuery.isFetching,
          data: queries.waiverConsentsQuery.data,
        },
      }),
    [
      reserved,
      slug,
      client,
      userId,
      organisationId,
      orgIds.length,
      queries,
      mutations,
    ]
  );
}
