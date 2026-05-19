# PR18 — Participant application progress

## Overview

- Purpose and scope: implement the participant-facing application progress experience in portal for BASE BA05b contract coverage.
- Dependencies: PR14, PR17, BASE BA05b.

## Acceptance criteria

- [x] Route exists under portal event workflows at `/:eventSlug/applications/:applicationId`.
- [x] The page shows application status and participant-visible approval-check progress context.
- [x] Organiser-only controls and token internals are never exposed.
- [x] Non-draft submitted applications from form journey can deep-link to this page.

## API / Contract

- Public exports: `src/pages/events/ApplicationProgressPage.tsx`, `src/hooks/events/useApplicationProgress.ts`.
- Data contracts: `base_application`, `base_application_check` (participant-safe subset), registration type labels/messages, and event summary context.
- Security contract: never expose `token_hash`, token expiry internals, or privileged actor identities.

## Verification

- Verify happy path with pending checks and completed checks.
- Verify unauthorized access is denied safely.

## Testing requirements

- Integration tests for status rendering and non-exposure of sensitive fields.

## References

- [../base/BA05b-participant-application-progress_requirements.md](../base/BA05b-participant-application-progress_requirements.md)
- [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md)
