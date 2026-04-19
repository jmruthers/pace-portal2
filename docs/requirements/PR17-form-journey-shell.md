# PR17 — Shared form journey shell

## Filename convention

This file is **`PR17-form-journey-shell.md`** — portal requirement slice **PR17** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---

## Overview

- Purpose and scope: define the shared authenticated form journey used by event and org workflows: intro, start/resume, draft persistence, field rendering handoff, submit handoff, and completion routing.
- Dependencies: PR01, PR02, PR14, PR15, PR16, and workflow contracts from BASE/TEAM slices.
- Standards: 01, 02, 03, 04, 05, 07, 08, 09.
- Rebuild intent: one reusable member-facing journey shell rather than duplicating per-workflow page structures.

## Acceptance criteria

- [ ] The form journey supports route contexts for `/:eventSlug/application`, `/:eventSlug/:formSlug`, and `/forms/:formSlug`.
- [ ] All routes require authenticated member context by default and preserve return URL through auth-required handoff.
- [ ] The same shell supports start, resume, and view-submitted (read-only where applicable) states.
- [ ] Draft creation/reuse and restore are handled through typed hooks/services and do not duplicate workflow side effects.
- [ ] Unsupported field types fail safely without crashing and are observable in tests.

## API / Contract

- Public exports: `src/pages/forms/FormJourneyPage.tsx`, `src/hooks/forms/useFormJourney.ts`, `src/hooks/forms/useFormEntrypoint.ts`.
- Service contracts:
  - Entrypoint resolution by route and workflow context.
  - Draft lifecycle (create/reuse/load) separate from final submit orchestration.
  - Submit adapter handoff by workflow type (BASE registration now; more adapters in follow-up slices).
- Data contracts: `core_forms`, `core_form_fields`, `core_form_responses`, `core_form_response_values`, `base_application` (where workflow requires), and workflow-specific adapter contracts.
- Do not embed domain-specific submit side effects directly in the shell.

## Visual specification

- Compose the page as: header/intro card, optional pre-submit checks, form renderer, primary action row, and state banners.
- Keep layout shared across workflow types; workflow-specific controls may be inserted as explicit extension points.

## Verification

- Verify route resolution for `/:eventSlug/application`, `/:eventSlug/:formSlug`, and `/forms/:formSlug`.
- Verify authenticated handoff, start/resume behavior, and draft restore.
- Verify submitted-state behavior is read-only unless workflow explicitly allows edits.

## Testing requirements

- Unit tests for route→entrypoint resolution and journey state transitions.
- Integration tests for auth-required handoff, draft lifecycle, and submit adapter invocation.

## Do not

- Do not duplicate separate page stacks per workflow when the shared journey can be reused.
- Do not move workflow-specific backend side effects into the shared shell.

## References

- [PR00-portal-architecture.md](./PR00-portal-architecture.md)
- [PR15-authenticated-form-rendering.md](./PR15-authenticated-form-rendering.md)
- [PR16-event-application-submission.md](./PR16-event-application-submission.md)
- [../base/slices/S05a-registration-entry-and-application-submission_requirements.md](../base/slices/S05a-registration-entry-and-application-submission_requirements.md)
- [../base/slices/S10-participant-activity-booking-experience_requirements.md](../base/slices/S10-participant-activity-booking-experience_requirements.md)
