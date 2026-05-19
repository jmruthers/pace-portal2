/**
 * BA10 — Client-side pre-flight validation from browse + booking rows (PR19).
 */
import {
  computeBookingWindowOpen,
  computeDuplicateBooking,
  computeSessionConflict,
} from '@/lib/activityBookingRules';
import type {
  BookingValidationResult,
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
} from '@/lib/activityBookingTypes';

export type ValidateActivityBookingInput = {
  application: ParticipantApplicationContext;
  sessionId: string;
  offerings: OfferingBrowseItem[];
  bookings: ParticipantBookingItem[];
  /** When true, participant must acknowledge consent before submit (portal gate). */
  consentRequired?: boolean;
  consentText?: string | null;
  now?: Date;
};

export function validateActivityBooking(input: ValidateActivityBookingInput): BookingValidationResult {
  const now = input.now ?? new Date();
  const sessionId = input.sessionId.trim();

  let offering: OfferingBrowseItem | undefined;
  let session:
    | OfferingBrowseItem['sessions'][number]
    | undefined;

  for (const o of input.offerings) {
    const s = o.sessions.find((row) => row.id === sessionId);
    if (s) {
      offering = o;
      session = s;
      break;
    }
  }

  const bookingWindowOpen =
    offering != null ? computeBookingWindowOpen(offering.booking_open_at, offering.booking_close_at, now) : false;

  const capacityFull = session?.capacityFull ?? false;
  const waitlistOpen = session?.waitlistOpen ?? false;

  const activeBookings = input.bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'waitlisted'
  );

  const duplicateBooking = computeDuplicateBooking(
    sessionId,
    activeBookings.map((b) => ({ session_id: b.session_id, status: b.status }))
  );

  const conflictBookings = activeBookings.map((b) => ({
    session_id: b.session_id,
    status: b.status,
    start_time: b.start_time,
    end_time: b.end_time,
    session_name: b.session_name,
  }));

  const { sessionConflict, conflictingSession } =
    session != null
      ? computeSessionConflict(sessionId, session.start_time, session.end_time, conflictBookings)
      : { sessionConflict: false, conflictingSession: null };

  const eligibilityDenied = input.application.status !== 'approved';

  const consentText =
    offering != null
      ? (input.consentText ?? offering.consentText ?? null)
      : (input.consentText ?? null);
  const consentRequired =
    offering != null
      ? offering.consentRequired
      : Boolean(input.consentRequired);

  const canBook =
    bookingWindowOpen &&
    (!capacityFull || waitlistOpen) &&
    !duplicateBooking &&
    !sessionConflict &&
    !eligibilityDenied;

  return {
    bookingWindowOpen,
    capacityFull,
    waitlistOpen,
    duplicateBooking,
    sessionConflict,
    conflictingSession,
    eligibilityDenied,
    consentRequired,
    consentText,
    canBook,
  };
}
