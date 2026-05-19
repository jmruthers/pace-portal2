/**
 * BA10 — Participant activity booking types (PR19).
 */

export const ACTIVITY_BOOKING_ACCESS_DENIED_MARKER = 'base_booking_access_denied';

export type ActivityBookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export type SessionBrowseItem = {
  id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  location_display: string | null;
  capacity: number;
  allow_waitlist: boolean;
  capacityFull: boolean;
  waitlistOpen: boolean;
  confirmedCount: number;
};

export type OfferingBrowseItem = {
  id: string;
  name: string;
  description: string | null;
  location_display: string | null;
  booking_open_at: string | null;
  booking_close_at: string | null;
  bookingWindowOpen: boolean;
  /** BA10 BR-Outcome-6 — waiver required when description is set and no prior waiver on this offering. */
  consentRequired: boolean;
  consentText: string | null;
  sessions: SessionBrowseItem[];
};

export type BookingValidationResult = {
  bookingWindowOpen: boolean;
  capacityFull: boolean;
  waitlistOpen: boolean;
  duplicateBooking: boolean;
  sessionConflict: boolean;
  conflictingSession: {
    session_id: string;
    session_name: string | null;
    start_time: string;
  } | null;
  eligibilityDenied: boolean;
  consentRequired: boolean;
  consentText: string | null;
  canBook: boolean;
};

export type ParticipantBookingItem = {
  id: string;
  session_id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  offering_name: string;
  status: ActivityBookingStatus;
  booked_at: string;
  cancelled_at: string | null;
  cancellable: boolean;
  onWaitlist: boolean;
};

export type ParticipantApplicationContext = {
  id: string;
  event_id: string;
  organisation_id: string;
  person_id: string;
  status: string;
};

export type ActivityBookingCreateResult = {
  booking_id: string;
  status: 'confirmed' | 'waitlisted';
};

export type ActivityBookingRpcErrorCode =
  | 'ACTIVITY_BOOKING_ACCESS_DENIED'
  | 'ACTIVITY_BOOKING_APPLICATION_NOT_FOUND'
  | 'ACTIVITY_BOOKING_SESSION_NOT_FOUND'
  | 'ACTIVITY_BOOKING_WINDOW_CLOSED'
  | 'ACTIVITY_BOOKING_CONFLICT'
  | 'ACTIVITY_BOOKING_DUPLICATE'
  | 'ACTIVITY_BOOKING_CAPACITY_FULL'
  | 'ACTIVITY_BOOKING_NOT_FOUND'
  | 'ACTIVITY_BOOKING_ALREADY_CANCELLED'
  | 'ACTIVITY_BOOKING_OVERRIDE_REQUIRED'
  | 'ACTIVITY_BOOKING_RPC'
  | 'ACTIVITY_BOOKING_SHAPE'
  | 'ACTIVITY_BOOKING_CONSENT'
  | 'ACTIVITY_BOOKING_VALIDATION'
  | 'ACTIVITY_BOOKING_CONTEXT'
  | 'ACTIVITY_BOOKING_NOT_CANCELLABLE'
  | 'ACTIVITY_BOOKING_CONSENT_PERSIST'
  | 'ACTIVITY_CONSENT_SHAPE'
  | 'ACTIVITY_CONSENT_INSERT'
  | 'ACTIVITY_CONSENT_QUERY';
