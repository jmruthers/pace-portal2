/**
 * BA10 book-session orchestration (create RPC + optional consent write, PR19).
 */
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { cancelActivityBooking, createActivityBooking } from '@/lib/activityBookingRpc';
import { persistActivityBookingConsent } from '@/lib/persistActivityBookingConsent';
import { validateActivityBooking } from '@/lib/validateActivityBooking';
import type {
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
} from '@/lib/activityBookingTypes';

export type ExecuteActivityBookSessionInput = {
  client: SupabaseClient<Database>;
  eventId: string;
  application: ParticipantApplicationContext;
  sessionId: string;
  consentAcknowledged: boolean;
  offerings: OfferingBrowseItem[];
  bookings: ParticipantBookingItem[];
  consentedByPersonId: string | null;
  createdByUserId: string | null;
};

export async function executeActivityBookSession(
  input: ExecuteActivityBookSessionInput
): Promise<ApiResult<void>> {
  const validation = validateActivityBooking({
    application: input.application,
    sessionId: input.sessionId,
    offerings: input.offerings,
    bookings: input.bookings,
  });
  if (validation.consentRequired && !input.consentAcknowledged) {
    return err({
      code: 'ACTIVITY_BOOKING_CONSENT',
      message: 'Please acknowledge the consent statement before booking.',
    });
  }
  if (!validation.canBook) {
    return err({
      code: 'ACTIVITY_BOOKING_VALIDATION',
      message: 'This session cannot be booked right now.',
    });
  }

  const created = await createActivityBooking(input.client, {
    eventId: input.eventId,
    applicationId: input.application.id,
    sessionId: input.sessionId,
    organisationId: input.application.organisation_id,
  });
  if (!isOk(created)) {
    return created;
  }

  let offeringForSession: OfferingBrowseItem | undefined;
  for (const o of input.offerings) {
    if (o.sessions.some((s) => s.id === input.sessionId)) {
      offeringForSession = o;
      break;
    }
  }

  if (
    offeringForSession?.consentRequired &&
    offeringForSession.consentText &&
    input.consentAcknowledged
  ) {
    if (!input.consentedByPersonId) {
      return err({
        code: 'ACTIVITY_BOOKING_CONTEXT',
        message: 'Booking context is not ready.',
      });
    }
    const consentSaved = await persistActivityBookingConsent(input.client, {
      bookingId: created.data.booking_id,
      applicationId: input.application.id,
      eventId: input.eventId,
      organisationId: input.application.organisation_id,
      consentedByPersonId: input.consentedByPersonId,
      consentedForPersonId: input.application.person_id,
      verbatimText: offeringForSession.consentText,
      createdByUserId: input.createdByUserId,
    });
    if (!isOk(consentSaved)) {
      if (input.createdByUserId) {
        await cancelActivityBooking(input.client, {
          bookingId: created.data.booking_id,
          cancelledBy: input.createdByUserId,
        });
      }
      return err({
        code: 'ACTIVITY_BOOKING_CONSENT_PERSIST',
        message:
          'Your booking could not be completed because the waiver could not be saved. Please try again.',
      });
    }
  }

  return ok(undefined);
}
