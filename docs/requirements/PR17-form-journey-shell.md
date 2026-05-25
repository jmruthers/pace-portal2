# PR17 — Shared form journey shell

## Filename convention

This file is **`PR17-form-journey-shell.md`** — portal requirement slice **PR17** (see [portal-project-brief.md](./portal-project-brief.md)).

---

## Overview

- Purpose and scope: define the shared authenticated form journey used by event and org workflows: direct fill/resume, draft persistence, field rendering handoff, submit handoff, and completion routing.
- Dependencies: PR01, PR02, PR14, PR15, PR16, and workflow contracts from BASE/TEAM slices.
- Standards: 01, 02, 03, 04, 05, 07, 08, 09.
- Rebuild intent: one reusable member-facing journey shell rather than duplicating per-workflow page structures.

## Acceptance criteria

- [x] The form journey supports route contexts for `/:eventSlug/application`, `/:eventSlug/:formSlug`, and `/forms/:formSlug`.
- [x] All routes require authenticated member context by default and preserve return URL through auth-required handoff.
- [x] The same shell supports fill, resume, and view-submitted (read-only where applicable) states.
- [x] Draft creation/reuse and restore are handled through typed hooks/services and do not duplicate workflow side effects.
- [x] Unsupported field types fail safely without crashing and are observable in tests.

## Implementation notes (pace-portal)

- **Event `base_registration`:** Full journey — opens directly into fill, draft resume via `useDraftApplication`, submit via PR16 adapter (`resolveSubmitMode` → `useApplicationSubmission`), and read-only **view-submitted** when `fetchSubmittedRegistrationSnapshot` returns a submitted snapshot (`FormRenderer` `readOnly`). In-app navigation to application progress (`/:eventSlug/applications/:applicationId`) ships with PR18; this slice avoids a dead-link control until that route exists.
- **`/forms/:formSlug` (org):** Authenticated load, fill, and pre-submit confirmations render through the same shell; **draft persistence and submit** are deferred to follow-up TEAM/org-aligned slices per [portal-architecture.md](./portal-architecture.md) (org signup / org workflow semantics). `useDraftApplication` stays disabled without an event scope (`event_id`). **Response window:** eligibility uses `opens_at` / `closes_at` only (org rows have no `event_id`, so dashboard event-card rules do not apply).
- **`view_submitted`:** Only for **event** routes where `workflow_type === 'base_registration'` and a non-draft submitted snapshot exists; otherwise the member stays in fill.

## API / Contract

- Public exports: `src/components/form-journey/FormJourneyShell.tsx` (component `FormJourneyShell`; `renderExtension` optional for workflow chrome), `src/hooks/forms/useFormJourney.ts`, `src/hooks/forms/useFormEntrypoint.ts`; shared discriminant type `FormEntrypoint` — `src/lib/formEntrypointResolution.ts`.
- Service contracts:
  - Entrypoint resolution by route and workflow context.
  - Draft lifecycle (create/reuse/load) separate from final submit orchestration.
  - Submit adapter handoff by workflow type (BASE registration now; more adapters in follow-up slices).
- Data contracts: `core_forms`, `core_form_fields`, `core_form_responses`, `core_form_response_values`, `base_application` (where workflow requires), and workflow-specific adapter contracts.
- Do not embed domain-specific submit side effects directly in the shell.

## Visual specification

- Compose the page as: form renderer, optional pre-submit checks, primary action row, and state banners.
- Keep layout shared across workflow types; workflow-specific controls may be inserted as explicit extension points.
- App chrome (header, nav, footer) comes from the route-level `PortalAuthenticatedLayout` wrapper; `FormJourneyShell` owns page content only.

## Verification

- Verify route resolution for `/:eventSlug/application`, `/:eventSlug/:formSlug`, and `/forms/:formSlug`.
- Verify authenticated handoff, fill/resume behavior, and draft restore.
- Verify submitted-state behavior is read-only unless workflow explicitly allows edits.

## Testing requirements

- Unit tests for route→entrypoint resolution and journey state transitions.
- Integration tests for auth-required handoff, draft lifecycle, and submit adapter invocation.

## Do not

- Do not duplicate separate page stacks per workflow when the shared journey can be reused.
- Do not move workflow-specific backend side effects into the shared shell.

## References

- [portal-architecture.md](./portal-architecture.md)
- [PR15-authenticated-form-rendering.md](./PR15-authenticated-form-rendering.md)
- [PR16-event-application-submission.md](./PR16-event-application-submission.md)
- [../base/BA05a-registration-entry-and-application-submission_requirements.md](../base/BA05a-registration-entry-and-application-submission_requirements.md)
- [../base/BA10-participant-activity-booking-experience_requirements.md](../base/BA10-participant-activity-booking-experience_requirements.md)
