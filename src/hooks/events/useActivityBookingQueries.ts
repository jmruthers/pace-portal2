import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { applyOfferingConsentProjections } from '@/lib/activityBookingConsent';
import { fetchActivityBookingBrowse } from '@/lib/fetchActivityBookingBrowse';
import { fetchActivityWaiverConsentedOfferingIds } from '@/lib/fetchActivityWaiverConsents';
import {
  fetchParticipantApplication,
  fetchParticipantBookings,
} from '@/lib/fetchParticipantBookings';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
export function useActivityBookingQueries(args: {
  client: SupabaseClient<Database> | null;
  secure: ReturnType<typeof import('@solvera/pace-core/rbac').useSecureSupabase> | null;
  userId: string | null;
  organisationId: string | null;
  orgIds: string[];
  slug: string;
  routingReady: boolean;
}) {
  const { client, secure, userId, organisationId, orgIds, slug, routingReady } = args;

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
    queryFn: async () => fetchCurrentPersonMember(secure!, userId!, organisationId!),
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

  const refetchAll = async () => {
    return Promise.all([
      eventQuery.refetch(),
      personQuery.refetch(),
      applicationQuery.refetch(),
      browseQuery.refetch(),
      bookingsQuery.refetch(),
      waiverConsentsQuery.refetch(),
    ]);
  };

  return {
    eventQuery,
    personQuery,
    applicationQuery,
    browseQuery,
    bookingsQuery,
    waiverConsentsQuery,
    eventRow,
    personId,
    application,
    offerings,
    bookings,
    refetchAll,
  };
}
