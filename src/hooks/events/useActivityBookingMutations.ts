import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { err, isOk, ok } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { cancelActivityBooking } from '@/lib/activityBookingRpc';
import { executeActivityBookSession } from '@/lib/executeActivityBookSession';
import type {
  BookingValidationResult,
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
} from '@/lib/activityBookingTypes';
import { validateActivityBooking } from '@/lib/validateActivityBooking';

type EventRow = Database['public']['Tables']['core_events']['Row'];

export function useActivityBookingMutations(args: {
  client: SupabaseClient<Database> | null;
  eventRow: EventRow | undefined;
  application: ParticipantApplicationContext | undefined;
  offerings: OfferingBrowseItem[];
  bookings: ParticipantBookingItem[];
  personId: string | null;
  userId: string | null;
}) {
  const { client, eventRow, application, offerings, bookings, personId, userId } = args;
  const queryClient = useQueryClient();
  const [lastActionError, setLastActionError] = useState<string | null>(null);

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

  return {
    validateSession,
    bookSession,
    cancelBooking,
    bookPending: bookMutation.isPending,
    cancelPending: cancelMutation.isPending,
    lastActionError,
    clearLastActionError,
  };
}
