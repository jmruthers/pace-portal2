/**
 * BA10 — Pure booking validation and RPC message mapping (PR19).
 */
import {
  ACTIVITY_BOOKING_ACCESS_DENIED_MARKER,
  type ActivityBookingCreateResult,
  type ActivityBookingRpcErrorCode,
  type BookingValidationResult,
} from '@/lib/activityBookingTypes';

/** BA10 BR-Outcome-1 — booking window open computation. */
export function computeBookingWindowOpen(
  bookingOpenAt: string | null,
  bookingCloseAt: string | null,
  now: Date = new Date()
): boolean {
  const t = now.getTime();
  if (bookingOpenAt == null && bookingCloseAt == null) {
    return true;
  }
  if (bookingOpenAt == null && bookingCloseAt != null) {
    return t <= new Date(bookingCloseAt).getTime();
  }
  if (bookingOpenAt != null && bookingCloseAt == null) {
    return t >= new Date(bookingOpenAt).getTime();
  }
  const open = new Date(bookingOpenAt!).getTime();
  const close = new Date(bookingCloseAt!).getTime();
  return t >= open && t <= close;
}

/** BA10 BR-Outcome-2 — only confirmed bookings count toward capacity. */
export function computeCapacityFull(confirmedCount: number, capacity: number): boolean {
  if (!Number.isFinite(capacity) || capacity < 0) return false;
  return confirmedCount >= capacity;
}

/** BA10 BR-Waitlist — capacity full and waitlist allowed on offering. */
export function computeWaitlistOpen(capacityFull: boolean, allowWaitlist: boolean): boolean {
  return capacityFull && allowWaitlist;
}

/** BA10 BR-Outcome-3 — duplicate active booking for same session. */
export function computeDuplicateBooking(
  sessionId: string,
  bookings: Array<{ session_id: string; status: string }>
): boolean {
  return bookings.some(
    (b) =>
      b.session_id === sessionId &&
      (b.status === 'confirmed' || b.status === 'waitlisted')
  );
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  return a0 < b1 && b0 < a1;
}

/** BA10 BR-Outcome-4 — overlapping session with another active booking. */
export function computeSessionConflict(
  targetSessionId: string,
  targetStart: string,
  targetEnd: string,
  bookings: Array<{
    session_id: string;
    status: string;
    start_time: string;
    end_time: string;
    session_name: string | null;
  }>
): { sessionConflict: boolean; conflictingSession: BookingValidationResult['conflictingSession'] } {
  for (const b of bookings) {
    if (b.session_id === targetSessionId) continue;
    if (b.status !== 'confirmed' && b.status !== 'waitlisted') continue;
    if (rangesOverlap(targetStart, targetEnd, b.start_time, b.end_time)) {
      return {
        sessionConflict: true,
        conflictingSession: {
          session_id: b.session_id,
          session_name: b.session_name,
          start_time: b.start_time,
        },
      };
    }
  }
  return { sessionConflict: false, conflictingSession: null };
}

/** BA10 BR-Cancellation — confirmed booking before session start. */
export function computeCancellable(
  status: string,
  sessionStartTime: string,
  now: Date = new Date()
): boolean {
  if (status !== 'confirmed') return false;
  return new Date(sessionStartTime).getTime() > now.getTime();
}

export function isActivityBookingAccessDenied(message: string): boolean {
  return message.includes(ACTIVITY_BOOKING_ACCESS_DENIED_MARKER);
}

export function mapActivityBookingRpcMessage(message: string): {
  code: ActivityBookingRpcErrorCode;
  participantMessage: string;
} {
  const m = message.trim();
  if (m.includes(ACTIVITY_BOOKING_ACCESS_DENIED_MARKER)) {
    return {
      code: 'ACTIVITY_BOOKING_ACCESS_DENIED',
      participantMessage: 'You cannot manage activity bookings for this event.',
    };
  }
  if (m.includes('base_booking_application_not_found')) {
    return {
      code: 'ACTIVITY_BOOKING_APPLICATION_NOT_FOUND',
      participantMessage: 'Your application is not approved for activity booking yet.',
    };
  }
  if (m.includes('base_booking_session_not_found')) {
    return {
      code: 'ACTIVITY_BOOKING_SESSION_NOT_FOUND',
      participantMessage: 'That session could not be found.',
    };
  }
  if (m.includes('base_booking_window_closed')) {
    return {
      code: 'ACTIVITY_BOOKING_WINDOW_CLOSED',
      participantMessage: 'Booking is not open for this activity right now.',
    };
  }
  if (m.includes('base_booking_conflict')) {
    return {
      code: 'ACTIVITY_BOOKING_CONFLICT',
      participantMessage: 'This session overlaps another activity you are booked into.',
    };
  }
  if (m.includes('base_booking_duplicate')) {
    return {
      code: 'ACTIVITY_BOOKING_DUPLICATE',
      participantMessage: 'You already have a booking for this session.',
    };
  }
  if (m.includes('base_booking_capacity_full')) {
    return {
      code: 'ACTIVITY_BOOKING_CAPACITY_FULL',
      participantMessage: 'This session is full and does not accept a waitlist.',
    };
  }
  if (m.includes('base_booking_not_found')) {
    return {
      code: 'ACTIVITY_BOOKING_NOT_FOUND',
      participantMessage: 'That booking could not be found.',
    };
  }
  if (m.includes('base_booking_already_cancelled')) {
    return {
      code: 'ACTIVITY_BOOKING_ALREADY_CANCELLED',
      participantMessage: 'This booking has already been cancelled.',
    };
  }
  if (m.includes('base_booking_override_reason_required')) {
    return {
      code: 'ACTIVITY_BOOKING_OVERRIDE_REQUIRED',
      participantMessage: 'This booking could not be completed.',
    };
  }
  return {
    code: 'ACTIVITY_BOOKING_RPC',
    participantMessage: m.length > 0 ? m : 'Activity booking could not be completed.',
  };
}

export function parseActivityBookingCreateResult(
  data: unknown
): { ok: true; data: ActivityBookingCreateResult } | { ok: false } {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  const o = data as Record<string, unknown>;
  const bookingId = o.booking_id;
  const status = o.status;
  if (typeof bookingId !== 'string' || bookingId.trim() === '') return { ok: false };
  if (status !== 'confirmed' && status !== 'waitlisted') return { ok: false };
  return { ok: true, data: { booking_id: bookingId, status } };
}

/** First validation failure message for display (BA10 recommended priority). */
export function primaryBookingBlockMessage(result: BookingValidationResult): string | null {
  if (!result.bookingWindowOpen) {
    return 'Booking is not open for this activity right now.';
  }
  if (result.eligibilityDenied) {
    return 'You are not eligible to book this activity.';
  }
  if (result.capacityFull && !result.waitlistOpen) {
    return 'This session is full.';
  }
  if (result.duplicateBooking) {
    return 'You already have a booking for this session.';
  }
  if (result.sessionConflict && result.conflictingSession) {
    const name =
      result.conflictingSession.session_name?.trim() || 'another session';
    return `This session conflicts with ${name}.`;
  }
  if (result.consentRequired) {
    return 'Please acknowledge the consent statement before booking.';
  }
  return null;
}
