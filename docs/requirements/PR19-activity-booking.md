# PR19 — Participant activity booking

## Overview

- Purpose and scope: implement member-facing activity booking in portal aligned to BASE BA10 contracts.
- Dependencies: PR14, PR17, BASE BA10/BA11.

## Acceptance criteria

- [ ] Booking journey is accessible from participant event hub.
- [ ] Participants can browse offerings/sessions and create/cancel bookings where allowed.
- [ ] Capacity, booking window, duplicate, conflict, and consent rules are enforced before persistence.
- [ ] Editing/cancel behavior remains allowed until close rules, per workflow contract.

## API / Contract

- Public exports: `src/pages/events/ActivityBookingPage.tsx`, `src/hooks/events/useActivityBooking.ts`.
- Data contracts: `base_activity_offering`, `base_activity_session`, `base_activity_booking`, consent capture contracts, and participant context from event/application.
- Orchestration contract: booking-side effects stay in workflow adapters/services; shared form journey primitives may be reused for consent/attestation segments.

## Verification

- Verify browse, book, waitlist/blocked outcomes, cancel/edit-before-close paths.

## Testing requirements

- Integration coverage for rule enforcement and participant-safe error outcomes.

## References

- [../base/BA10-participant-activity-booking-experience_requirements.md](../base/BA10-participant-activity-booking-experience_requirements.md)
- [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md)
- [PR17-form-journey-shell.md](./PR17-form-journey-shell.md)
