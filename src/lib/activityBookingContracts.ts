/**
 * BA10 — Participant activity booking contracts barrel (PR19).
 */
/* eslint-disable pace-core-compliance/max-named-exports -- Re-exports BA10 types and rules for PR19 consumers. */
export type {
  ActivityBookingCreateResult,
  ActivityBookingRpcErrorCode,
  ActivityBookingStatus,
  BookingValidationResult,
  OfferingBrowseItem,
  ParticipantApplicationContext,
  ParticipantBookingItem,
  SessionBrowseItem,
} from '@/lib/activityBookingTypes';

export { ACTIVITY_BOOKING_ACCESS_DENIED_MARKER } from '@/lib/activityBookingTypes';

export {
  computeBookingWindowOpen,
  computeCapacityFull,
  computeCancellable,
  computeDuplicateBooking,
  computeSessionConflict,
  computeWaitlistOpen,
  isActivityBookingAccessDenied,
  mapActivityBookingRpcMessage,
  parseActivityBookingCreateResult,
  primaryBookingBlockMessage,
} from '@/lib/activityBookingRules';
