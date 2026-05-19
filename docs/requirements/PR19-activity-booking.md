# PR19 — Participant activity booking

## Overview

- Purpose and scope: implement member-facing activity booking in portal aligned to BASE BA10 contracts.
- Dependencies: PR14, PR17, BASE BA10/BA11.

## Acceptance criteria

- [x] Booking journey is accessible from participant event hub.
- [x] Participants can browse offerings/sessions and create/cancel bookings where allowed.
- [x] Capacity, booking window, duplicate, conflict, and consent rules are enforced before persistence.
- [x] Editing/cancel behavior remains allowed until close rules, per workflow contract (cancel-only; no session reschedule in this slice).

## API / Contract

- Public exports: `src/pages/events/ActivityBookingPage.tsx`, `src/hooks/events/useActivityBooking.ts`.
- Data contracts: `base_activity_offering`, `base_activity_session`, `base_activity_booking`, consent capture contracts, and participant context from event/application.
- Orchestration contract: booking-side effects stay in workflow adapters/services; shared form journey primitives may be reused for consent/attestation segments.

## Implementation notes (pace-portal)

- **Route:** `/:eventSlug/activities` via [`ActivityBookingPage.tsx`](../src/pages/events/ActivityBookingPage.tsx) and [`ActivityBookingView.tsx`](../src/components/events/ActivityBookingView.tsx); hub handoff [`EventHubActivitiesSection.tsx`](../src/components/events/EventHubActivitiesSection.tsx).
- **Writes:** `app_base_activity_booking_create` / `app_base_activity_booking_cancel` via [`activityBookingRpc.ts`](../src/lib/activityBookingRpc.ts); client pre-flight via [`validateActivityBooking.ts`](../src/lib/validateActivityBooking.ts).
- **Consent (BA10 BR-Outcome-6):** Waiver text is projected from non-empty `base_activity_offering.description`. Consent is required when that text exists and the participant has no existing `base_consent` row with `consent_type = 'activity_waiver'` anchored to a prior booking on the same offering (same application). Acknowledgement is gated in the UI; persistence inserts into `base_consent` (including `application_id`) after a successful booking create. If consent insert fails after create, the portal compensates with participant cancel so no orphan booking remains without waiver. PR17 form-journey reuse remains optional follow-up.
- **Cancel-only edit:** Participants may cancel confirmed future bookings only (`computeCancellable`); waitlist withdrawal is not in v1.
- **Proxy:** Browse is available in proxy mode; book/cancel mutations are disabled when proxy is active.

## Verification

- Verify browse, book, waitlist/blocked outcomes, cancel/edit-before-close paths.

## Testing requirements

- Integration coverage for rule enforcement and participant-safe error outcomes.

## References

- [../base/BA10-participant-activity-booking-experience_requirements.md](../base/BA10-participant-activity-booking-experience_requirements.md)
- [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md)
- [PR17-form-journey-shell.md](./PR17-form-journey-shell.md)
