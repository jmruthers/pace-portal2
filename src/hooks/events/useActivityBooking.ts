import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import { applyOfferingConsentProjections } from '@/lib/activityBookingConsent';
import { fetchActivityBookingBrowse } from '@/lib/fetchActivityBookingBrowse';
import { fetchActivityWaiverConsentedOfferingIds } from '@/lib/fetchActivityWaiverConsents';
import {
  fetchParticipantApplication,
  fetchParticipantBookings,
} from '@/lib/fetchParticipantBookings';
import { cancelActivityBooking } from '@/lib/activityBookingRpc';
import { executeActivityBookSession } from '@/lib/executeActivityBookSession';
import { resolveActivityBookingPhase } from '@/hooks/events/resolveActivityBookingPhase';
import type {
  BookingValidationResult,
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
} from '@/lib/activityBookingContracts';
import { validateActivityBooking } from '@/lib/validateActivityBooking';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';

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

/**
 * Participant activity booking orchestration (`/:eventSlug/activities`, PR19 / BA10).
 */
/* eslint-disable complexity -- PR19 hook: event, person, application, browse, bookings, and mutations share one surface. */
export function useActivityBooking(eventSlugRaw: string | undefined): UseActivityBookingResult {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const queryClient = useQueryClient();
  const [lastActionError, setLastActionError] = useState<string | null>(null);

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

  const eventQuery = useQuery({
    queryKey: ['activityBooking', 'event', 'v1', userId, organisationId, orgIds.join(','), slug],
    enabled: routingReady,
    staleTime: 30_000,
    queryFn: async () => lookupEventRowBySlug(client!, slug, orgIds),
  });

  const eventRow =
    eventQuery.data && isOk(eventQuery.data) ? eventQuery.data.data : undefined;

  const personQuery = useQuery({
    queryKey: ['activityBooking', 'person', 'v1', userId, organisationId],
    enabled: Boolean(routingReady && eventRow?.event_id),
    staleTime: 30_000,
    queryFn: async () => {
      const pm = await fetchCurrentPersonMember(secure, userId!, organisationId!);
      return pm;
    },
  });

  const personOk =
    personQuery.data && isOk(personQuery.data) ? personQuery.data.data : undefined;
  const personId = personOk?.person.id ?? null;

  const applicationQuery = useQuery({
    queryKey: ['activityBooking', 'application', 'v1', personId, eventRow?.event_id],
    enabled: Boolean(routingReady && eventRow?.event_id && personId),
    staleTime: 15_000,
    queryFn: async () => fetchParticipantApplication(client!, personId!, eventRow!.event_id),
  });

  const application =
    applicationQuery.data && isOk(applicationQuery.data) ? applicationQuery.data.data : undefined;

  const hasApplication = application != null;

  const browseQuery = useQuery({
    queryKey: ['activityBooking', 'browse', 'v1', eventRow?.event_id],
    enabled: Boolean(routingReady && eventRow?.event_id && hasApplication),
    staleTime: 15_000,
    queryFn: async () => fetchActivityBookingBrowse(client!, eventRow!.event_id),
  });

  const bookingsQuery = useQuery({
    queryKey: ['activityBooking', 'bookings', 'v1', application?.id],
    enabled: Boolean(routingReady && application?.id),
    staleTime: 15_000,
    queryFn: async () => fetchParticipantBookings(client!, application!.id),
  });

  const waiverConsentsQuery = useQuery({
    queryKey: [
      'activityBooking',
      'waiverConsents',
      'v1',
      application?.id,
      personId,
      eventRow?.event_id,
    ],
    enabled: Boolean(routingReady && application?.id && personId && eventRow?.event_id),
    staleTime: 15_000,
    queryFn: async () =>
      fetchActivityWaiverConsentedOfferingIds(client!, {
        applicationId: application!.id,
        personId: personId!,
        eventId: eventRow!.event_id,
      }),
  });

  const offerings = useMemo(() => {
    const raw = browseQuery.data && isOk(browseQuery.data) ? browseQuery.data.data : [];
    const consented =
      waiverConsentsQuery.data && isOk(waiverConsentsQuery.data)
        ? waiverConsentsQuery.data.data
        : new Set<string>();
    return applyOfferingConsentProjections(raw, consented);
  }, [browseQuery.data, waiverConsentsQuery.data]);
  const bookings = useMemo(
    () => (bookingsQuery.data && isOk(bookingsQuery.data) ? bookingsQuery.data.data : []),
    [bookingsQuery.data]
  );

  const refetchAll = useCallback(async () => {
    return Promise.all([
      eventQuery.refetch(),
      personQuery.refetch(),
      applicationQuery.refetch(),
      browseQuery.refetch(),
      bookingsQuery.refetch(),
      waiverConsentsQuery.refetch(),
    ]);
  }, [eventQuery, personQuery, applicationQuery, browseQuery, bookingsQuery, waiverConsentsQuery]);

  const invalidateBookingQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['activityBooking', 'browse'] });
    await queryClient.invalidateQueries({ queryKey: ['activityBooking', 'bookings'] });
    await queryClient.invalidateQueries({ queryKey: ['activityBooking', 'waiverConsents'] });
  }, [queryClient]);

  const bookMutation = useMutation({
    mutationFn: async ({
      sessionId,
      consentAcknowledged,
    }: {
      sessionId: string;
      consentAcknowledged: boolean;
    }) => {
      if (!client || !eventRow || !application) {
        return err({ code: 'ACTIVITY_BOOKING_CONTEXT', message: 'Booking context is not ready.' });
      }
      const result = await executeActivityBookSession({
        client,
        eventId: eventRow.event_id,
        application,
        sessionId,
        consentAcknowledged,
        offerings,
        bookings,
        consentedByPersonId: personId,
        createdByUserId: userId,
      });
      if (!isOk(result)) {
        return result;
      }
      await invalidateBookingQueries();
      return ok(undefined);
    },
    onMutate: () => setLastActionError(null),
    onError: (e: Error) => setLastActionError(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!client || !userId) {
        return err({ code: 'ACTIVITY_BOOKING_CONTEXT', message: 'Booking context is not ready.' });
      }
      const row = bookings.find((b) => b.id === bookingId);
      if (!row?.cancellable) {
        return err({
          code: 'ACTIVITY_BOOKING_NOT_CANCELLABLE',
          message: 'This booking cannot be cancelled.',
        });
      }
      const cancelled = await cancelActivityBooking(client, {
        bookingId,
        cancelledBy: userId,
      });
      if (!isOk(cancelled)) {
        return cancelled;
      }
      await invalidateBookingQueries();
      return ok(undefined);
    },
    onMutate: () => setLastActionError(null),
    onError: (e: Error) => setLastActionError(e.message),
  });

  const validateSession = useCallback(
    (sessionId: string): BookingValidationResult | null => {
      if (!application) return null;
      return validateActivityBooking({
        application,
        sessionId,
        offerings,
        bookings,
      });
    },
    [application, offerings, bookings]
  );

  const bookSession = useCallback(
    async (sessionId: string, consentAcknowledged: boolean) => {
      const result = await bookMutation.mutateAsync({ sessionId, consentAcknowledged });
      if (!isOk(result)) {
        setLastActionError(result.error.message);
      }
      return result;
    },
    [bookMutation]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const result = await cancelMutation.mutateAsync(bookingId);
      if (!isOk(result)) {
        setLastActionError(result.error.message);
      }
      return result;
    },
    [cancelMutation]
  );

  const clearLastActionError = useCallback(() => setLastActionError(null), []);

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
          refetchAll,
          validateSession,
          bookSession,
          cancelBooking,
          bookPending: bookMutation.isPending,
          cancelPending: cancelMutation.isPending,
          lastActionError,
          clearLastActionError,
        },
        event: {
          loading: eventQuery.isLoading || eventQuery.isFetching,
          data: eventQuery.data,
          row: eventRow,
        },
        person: {
          loading: personQuery.isLoading || personQuery.isFetching,
          data: personQuery.data,
          personId,
        },
        application: {
          loading: applicationQuery.isLoading || applicationQuery.isFetching,
          data: applicationQuery.data,
          row: application ?? undefined,
        },
        browse: {
          loading: browseQuery.isLoading || browseQuery.isFetching,
          data: browseQuery.data,
          offerings,
        },
        bookings: {
          loading: bookingsQuery.isLoading || bookingsQuery.isFetching,
          data: bookingsQuery.data,
          bookings,
        },
        waiver: {
          loading: waiverConsentsQuery.isLoading || waiverConsentsQuery.isFetching,
          data: waiverConsentsQuery.data,
        },
      }),
    [
      reserved,
      slug,
      client,
      userId,
      organisationId,
      orgIds.length,
      refetchAll,
      validateSession,
      bookSession,
      cancelBooking,
      bookMutation.isPending,
      cancelMutation.isPending,
      lastActionError,
      clearLastActionError,
      eventQuery.isLoading,
      eventQuery.isFetching,
      eventQuery.data,
      eventRow,
      personQuery.isLoading,
      personQuery.isFetching,
      personQuery.data,
      personId,
      applicationQuery.isLoading,
      applicationQuery.isFetching,
      applicationQuery.data,
      application,
      browseQuery.isLoading,
      browseQuery.isFetching,
      browseQuery.data,
      bookingsQuery.isLoading,
      bookingsQuery.isFetching,
      bookingsQuery.data,
      waiverConsentsQuery.isLoading,
      waiverConsentsQuery.isFetching,
      waiverConsentsQuery.data,
      offerings,
      bookings,
    ]
  );
}
