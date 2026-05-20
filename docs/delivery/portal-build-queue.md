# Portal Build Queue

## Run Readiness Summary

- Backend-ready report: `../pace-core2/docs/delivery/portal-backend-ready-report.md` (`Gate status: PASS`)
- Backend freeze status: `Frozen for this run` — slices **PR01–PR22**; no incremental portal/backend DDL in this frontend execution lane (per portal-backend-ready-report)
- Unresolved blockers: **0** (`none`)
- Execution mode: **full run**

## Dependency handling for this run

- Source authority for slice identity/title/dependencies: [`docs/requirements/`](../requirements/) numbered `PR##-*.md` slices **PR01–PR22**.
- `.contract` dependencies from requirement prose (BASE BA05b/BA07/BA10/BA11, TEAM TM01, etc.) are backend-pre-satisfied for runtime sequencing **when** the backend-ready gate is PASS and backend is frozen for this run — record those edges **only under Evidence**, not as `depends_on` queue prerequisites.
- Runtime `depends_on` values in the queue table list **executable** portal-slice build-order prerequisites only; authority wording that cites non-PR tracks does not duplicate as `depends_on` while the gate PASS + freeze applies.
- TEAM backend-ready FAIL for TM02/TM11–TM13 remains a **QA cross-check advisory** only for dashboard profile-photo paths (portal-backend-ready-report); **not** a queued `Blocked` row for this frontend run absent missing portal slice contracts.

## Queue

| slice_id | depends_on | status | blocker_reason |
|---|---|---|---|
| PR01 — App shell routing | - | Built | — |
| PR02 — Shared services hooks | PR01 | Built | — |
| PR04 — Register placeholder | PR01 | Built | — |
| PR20 — Token approval host surfaces | PR01 | Built | — |
| PR03 — Dashboard composition | PR01, PR02 | Built | — |
| PR05 — Profile wizard shell | PR01, PR02 | Built | — |
| PR12 — Contacts listing | PR01, PR02 | Built | — |
| PR13 — Contact create edit flow | PR12 | Built | — |
| PR06 — Wizard field details | PR05 | Built | — |
| PR07 — Member profile self-service | PR01, PR02 | Built | — |
| PR08 — Proxy delegated editing | PR01, PR07 | Built | — |
| PR09 — Medical profile summary | PR07 | Built | — |
| PR11 — Action-plan files | PR09 | Built | — |
| PR10 — Medical conditions CRUD | PR09, PR11 | Built | — |
| PR14 — Event selector and participant hub | PR03 | Built | — |
| PR15 — Authenticated form rendering | PR01, PR02, PR14 | Built | — |
| PR16 — Event application submission | PR15 | Built | — |
| PR17 — Shared form journey shell | PR01, PR02, PR14, PR15, PR16 | Built | — |
| PR18 — Participant application progress | PR14, PR17 | Built | — |
| PR19 — Participant activity booking | PR14, PR17 | Built | — |
| PR21 — Participant itinerary | PR14 | Not built | — |
| PR22 — My Memberships | PR01, PR02, PR05, PR06, PR07, PR15, PR17 | Built | — |

## Evidence

### PR01 — App shell routing

- authority: [`docs/requirements/PR01-app-shell-routing.md`](../requirements/PR01-app-shell-routing.md)
- backend freeze: None — CORE RBAC catalogue for shell route guards (portal-backend-ready-report slice coverage)

### PR02 — Shared services hooks

- authority: [`docs/requirements/PR02-shared-services-hooks.md`](../requirements/PR02-shared-services-hooks.md)
- backend freeze: None — CORE + MEDI + BASE read surfaces for hooks (portal-backend-ready-report slice coverage)

### PR04 — Register placeholder

- authority: [`docs/requirements/PR04-register-placeholder.md`](../requirements/PR04-register-placeholder.md)
- backend freeze: None — auth surface only (portal-backend-ready-report slice coverage)

### PR20 — Token approval host surfaces

- authority: [`docs/requirements/PR20-token-approval-host.md`](../requirements/PR20-token-approval-host.md)
- backend freeze: None — BA07 RPCs verified PASS (portal-backend-ready-report contract verification matrix / RPC table)
- contract (Evidence only): BASE BA07 — `app_base_application_check_resolve_token`, `app_base_application_check_submit`; authority doc [`../../../pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md`](../../../pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md)
- implementation: public route `/approvals/:token` in `src/App.tsx`; page `src/pages/public/TokenApprovalPage.tsx`; hook `src/hooks/approvals/useTokenApproval.ts` + `tokenApprovalContracts.ts`; RPC bridge `src/lib/tokenApprovalRpc.ts`; `approvals` reserved in `src/routing/eventFormPaths.ts`

### PR03 — Dashboard composition

- authority: [`docs/requirements/PR03-dashboard-composition.md`](../requirements/PR03-dashboard-composition.md)
- backend freeze: None — dashboard composes CORE file RPC surfaces with PR02 hooks (portal-backend-ready-report slice coverage)
- QA advisory (non-blocking): TEAM backend-ready FAIL for TM02 does not negate portal MCP evidence — still exercise PR03 profile-photo paths manually or in-app tests per portal-backend-ready-report

### PR05 — Profile wizard shell

- authority: [`docs/requirements/PR05-profile-wizard-shell.md`](../requirements/PR05-profile-wizard-shell.md)
- backend freeze: **PORTAL-DB-001** — PACE `profile-complete` page guard + rbac_page_permissions posture (portal-backend-ready-report PORTAL-DB-001)

### PR12 — Contacts listing

- authority: [`docs/requirements/PR12-contacts-listing.md`](../requirements/PR12-contacts-listing.md)
- backend freeze: None — Pace contact read RPCs PASS (portal-backend-ready-report slice coverage)

### PR13 — Contact create edit flow

- authority: [`docs/requirements/PR13-contact-create-edit-flow.md`](../requirements/PR13-contact-create-edit-flow.md)
- backend freeze: None — `app_pace_contact_*` PASS (portal-backend-ready-report RPC table)

### PR06 — Wizard field details

- authority: [`docs/requirements/PR06-wizard-field-details.md`](../requirements/PR06-wizard-field-details.md)
- backend freeze: **PORTAL-DB-003** — `data_pace_joinable_organisations_search`; Step 5 org search aligns with RPC (portal-backend-ready-report PORTAL-DB-003 + documentation alignment notes)

### PR07 — Member profile self-service

- authority: [`docs/requirements/PR07-member-profile-self-service.md`](../requirements/PR07-member-profile-self-service.md)
- backend freeze: None — PR07 migrations / RPCs PASS (portal-backend-ready-report slice coverage)

### PR08 — Proxy delegated editing

- authority: [`docs/requirements/PR08-proxy-delegated-editing.md`](../requirements/PR08-proxy-delegated-editing.md)
- backend freeze: None — p4 delegated access + member access RPCs PASS (portal-backend-ready-report slice coverage)
- implementation: Delegated member profile editing uses `/member-profile?targetMemberId=…` plus `fetchDelegatedMemberProfileLoadModel` / `useMemberProfileData` v2 query key; `ProfilePrompts` medical handoff uses `/medical-profile?targetMemberId=…`; `useEffectiveMedicalMemberId` resolves proxy target before delegate `needs_setup` gate.

### PR09 — Medical profile summary

- authority: [`docs/requirements/PR09-medical-profile-summary.md`](../requirements/PR09-medical-profile-summary.md)
- backend freeze: None — MEDI cluster PASS (portal-backend-ready-report slice coverage)

### PR11 — Action-plan files

- authority: [`docs/requirements/PR11-action-plan-files.md`](../requirements/PR11-action-plan-files.md)
- backend freeze: None — `core_file_references` + DB-316 medi condition columns PASS (portal-backend-ready-report slice coverage / schema samples)
- sequencing: Normative lockstep with PR10 — landing `useActionPlans` cleanup before PR10 modal upload/link per PR10 implementation sequencing

### PR10 — Medical conditions CRUD

- authority: [`docs/requirements/PR10-medical-conditions-crud.md`](../requirements/PR10-medical-conditions-crud.md)
- backend freeze: None — `get_medi_conditions` PASS (portal-backend-ready-report slice coverage)
- sequencing: Depends on PR11 for lockstep with action-plan lifecycle per PR10/PR11 implementation sequencing

### PR14 — Event selector and participant hub

- authority: [`docs/requirements/PR14-event-selector-and-hub.md`](../requirements/PR14-event-selector-and-hub.md)
- backend freeze: None — events + logos + hub read contracts PASS (portal-backend-ready-report slice coverage); corroborated with base-backend-ready-report per portal-backend-ready-report
- implementation: dashboard slot `src/components/events/DashboardEventSelector.tsx`; selector + CTAs `src/components/events/EventList.tsx`; authenticated logos `src/components/events/EventLogo.tsx` + `src/hooks/events/useFileReferences.ts`; action mapping `src/hooks/events/eventDashboardAction.ts`; hub `src/pages/events/EventHubPage.tsx` + `src/hooks/events/useEventHub.ts`; routes `src/App.tsx` (`/:eventSlug`, `/:eventSlug/application`, `/:eventSlug/:formSlug`); dashboard wiring `src/pages/DashboardPage.tsx`; landing/event visibility `src/shared/hooks/useEnhancedLanding.ts`, `src/shared/lib/dashboardEventVisibility.ts`. Participant hub is intentionally mounted outside `PortalAuthenticatedLayout` and without a dedicated `PagePermissionGuard` catalogue row until RBAC catalogues include one; access relies on `ProtectedRoute`, organisation gate, and row-level visibility (see `EventHubPage` JSDoc).
- tests: `src/components/events/EventList.test.tsx`, `src/components/events/EventLogo.test.tsx`, `src/components/events/DashboardEventSelector.test.tsx`, `src/hooks/events/eventDashboardAction.test.ts`, `src/hooks/events/useEventHub.test.ts`, `src/hooks/events/useFileReferences.test.tsx`, `src/pages/events/EventHubPage.test.tsx`
- validate: `npm run validate` — PASS (`audit/202605171344-*` step reports + `audit/202605171345-pace-core-audit.md`)
- contract note (Evidence only): logos resolve via direct `core_file_references` reads (same table family as `data_file_reference_list`); no dynamic event/org palette theming in this slice per requirement.

### PR15 — Authenticated form rendering

- acceptance: **Acceptance criteria** in authority doc marked complete (functional verification).
- authority: [`docs/requirements/PR15-authenticated-form-rendering.md`](../requirements/PR15-authenticated-form-rendering.md)
- backend freeze: None — CORE `core_form_*` + BASE linkage PASS (portal-backend-ready-report slice coverage)
- depends_on rationale: Executable prereq PR14 inferred from [`PR17-form-journey-shell.md`](../requirements/PR17-form-journey-shell.md) listing PR14 alongside PR15/PR16 and event-flow architecture routing
- implementation: page `src/pages/events/FormFillPage.tsx`; renderer `src/components/events/FormRenderer.tsx`; event form routes `src/pages/events/EventFormRoutes.tsx`; hooks `src/hooks/events/useFormBySlug.ts`, `src/hooks/events/useFormFieldData.ts`, `src/hooks/events/useDraftApplication.ts`, `src/hooks/events/useFormAdditionalContactsPreview.ts`, `src/hooks/events/useFormFillTargetPerson.ts`; field metadata/registry `src/shared/lib/formFieldMeta.tsx`; `src/hooks/auth/usePhoneNumbers.ts` re-export; `/:eventSlug/application` and `/:eventSlug/:formSlug` wired from `src/App.tsx`.
- tests: `src/shared/lib/formFieldMeta.test.ts`, `src/components/events/FormRenderer.test.tsx`, `src/hooks/events/useFormBySlug.test.ts`, `src/hooks/events/useFormFieldData.test.ts`, `src/hooks/events/useDraftApplication.test.ts`, `src/hooks/events/useFormFillTargetPerson.test.tsx`, `src/hooks/events/useFormAdditionalContactsPreview.test.tsx`, `src/pages/events/FormFillPage.test.tsx`, `src/pages/events/EventFormRoutes.test.tsx`; smoke import `src/pages/PageSmoke.test.tsx`.
- validate: `npm run validate` — PASS (`audit/202605171424-*` step reports + `audit/202605171425-pace-core-audit.md`)

### PR16 — Event application submission

- acceptance: **four** acceptance criteria fully satisfied in [`PR16-event-application-submission.md`](../requirements/PR16-event-application-submission.md); **three** marked partial — legacy draft `base_application` submit path, duplicate-safe semantics under legacy rows, and orphan-row possibility after RPC success when response finalisation fails (documented in requirement Implementation notes + code comment in `eventApplicationSubmission.ts`).
- authority: [`docs/requirements/PR16-event-application-submission.md`](../requirements/PR16-event-application-submission.md)
- backend freeze: None — BA05a application RPCs PASS (portal-backend-ready-report slice coverage)
- depends_on rationale: Executable prereq PR15 inferred from [`PR17-form-journey-shell.md`](../requirements/PR17-form-journey-shell.md) journey composition
- implementation: `src/lib/eventApplicationSubmission.ts`; `src/hooks/events/useApplicationSubmission.ts`; submit wiring in `src/pages/events/FormFillPage.tsx` and `src/components/events/FormRenderer.tsx`; draft bundle/value persistence `src/hooks/events/useDraftApplication.ts` (shared with PR15).
- tests: `src/lib/eventApplicationSubmission.test.ts`, `src/hooks/events/useApplicationSubmission.test.ts`, `src/pages/events/FormFillPage.test.tsx`, `src/components/events/FormRenderer.test.tsx`, plus draft coverage `src/hooks/events/useDraftApplication.test.ts`.
- validate: `npm run validate` — PASS (`audit/202605171501-*` step reports + `audit/202605171502-pace-core-audit.md`)
- contract note (documentation alignment, not blocker): Duplicate/idempotency vs DB unique key **`UNIQUE (event_id, person_id)`** — PR16 aspiration for per-form wording documented vs DB in portal-backend-ready-report PR16 uniqueness note
- contract note: **`PARTIAL_PERSISTENCE`** — if `app_base_application_create` succeeds and the subsequent `core_form_responses` update fails, the client cannot roll back the RPC; user sees error UX only (see implementation comment).
- contract (Evidence only): BASE BA05a — [`../../../pace-core2/docs/requirements/base/BA05a-registration-entry-and-application-submission_requirements.md`](../../../pace-core2/docs/requirements/base/BA05a-registration-entry-and-application-submission_requirements.md); portal submit persists response values then invokes `app_base_application_create` with `p_form_response_id` per requirement Implementation notes.

### PR17 — Shared form journey shell

- acceptance: All five acceptance criteria in [`PR17-form-journey-shell.md`](../requirements/PR17-form-journey-shell.md) marked complete; org `/forms/:formSlug` draft persistence and submit deferred in requirement **Implementation notes** (follow-up TEAM/org slices per [portal-architecture.md](../requirements/portal-architecture.md)).
- authority: [`docs/requirements/PR17-form-journey-shell.md`](../requirements/PR17-form-journey-shell.md)
- backend freeze: None — same readiness band as PR15–PR16 (portal-backend-ready-report slice coverage rows)
- depends_on rationale: Executable prereqs PR01, PR02, PR14, PR15, PR16 per requirement Dependencies
- implementation: Journey shell `src/components/form-journey/FormJourneyShell.tsx`; org wrapper `src/pages/forms/OrgFormRoutes.tsx` (`PagePermissionGuard`); thin event wrapper `src/pages/events/FormFillPage.tsx` (`PagePermissionGuard` — no duplicate guard on shell component); hooks `src/hooks/forms/useFormJourney.ts`, `src/hooks/forms/useFormEntrypoint.ts`; libs `src/lib/formEntrypointResolution.ts` (`FormEntrypoint` type union), `src/lib/formSubmitAdapters.ts`, `src/lib/fetchOrgFormBySlug.ts`, `src/lib/fetchSubmittedRegistrationSnapshot.ts`; routing `src/App.tsx` (`forms/:formSlug` before `:eventSlug/*`), `src/routing/eventFormPaths.ts` (`forms` reserved); read-only submitted UX via `readOnly` on `src/components/events/FormRenderer.tsx`.
- tests: `src/lib/formSubmitAdapters.test.ts`, `src/lib/fetchOrgFormBySlug.test.ts`, `src/lib/fetchSubmittedRegistrationSnapshot.test.ts`, `src/hooks/forms/useFormEntrypoint.test.tsx`, `src/hooks/forms/useFormJourney.test.tsx`, `src/pages/forms/OrgFormRoutes.test.tsx`, `src/routing/eventFormPaths.test.ts`, `src/components/events/FormRenderer.test.tsx`, `src/pages/events/FormFillPage.test.tsx`.
- validate: `npm run validate` — PASS (`audit/202605171533-*` step reports + `audit/202605171534-pace-core-audit.md`)
- contract note: Org `/forms/:formSlug` — authenticated load and fill only until follow-up slices add org draft/submit adapters.
- contract (Evidence only — not `depends_on`): BASE/TEAM workflow contracts referenced by PR17 (see requirement References); gate PASS freezes consumption for this run

### PR18 — Participant application progress

- acceptance: all four acceptance criteria in authority doc marked complete
- authority: [`docs/requirements/PR18-application-progress.md`](../requirements/PR18-application-progress.md)
- backend freeze: None — BA05b `app_base_application_progress_get` PASS (portal-backend-ready-report)
- depends_on rationale: PR14 + PR17 per requirement Dependencies
- implementation: page `src/pages/events/ApplicationProgressPage.tsx`; view `src/components/events/ApplicationProgressView.tsx` (checks sorted by `sort_order`); hook `src/hooks/events/useApplicationProgress.ts`; fetch `src/lib/fetchApplicationProgress.ts`; contracts `src/lib/applicationProgressContracts.ts`; path helper `src/routing/eventFormPaths.ts` (`eventApplicationProgressPath`); route shell `src/pages/events/EventFormRoutes.tsx` (`EventApplicationProgressRoute`); `src/App.tsx` registers `/:eventSlug/applications/:applicationId` before `/:eventSlug/:formSlug`; form-journey deep link via `src/components/form-journey/FormJourneyShell.tsx` → `src/components/events/FormRenderer.tsx` (`participantProgressAction`, hidden under proxy)
- tests: `src/lib/applicationProgressContracts.test.ts`, `src/lib/fetchApplicationProgress.test.ts`, `src/hooks/events/useApplicationProgress.test.tsx`, `src/pages/events/ApplicationProgressPage.test.tsx` (status/checks, sort_order ordering, empty checks, failed/waived, sensitive-key non-exposure, access denied), `src/routing/eventFormPaths.test.ts`, `src/pages/events/FormFillPage.test.tsx` (submitted progress deep link + proxy negative)
- validate: `npm run validate` — PASS (`audit/202605191802-*` step reports + `audit/202605191803-pace-core-audit.md`)
- contract (Evidence only): BASE BA05b — authority file lives in pace-core2 (`BA05b-participant-application-progress_requirements.md`), not vendored in this repo

### PR19 — Participant activity booking

- acceptance: all four acceptance criteria in [`PR19-activity-booking.md`](../requirements/PR19-activity-booking.md) marked complete; consent projected from non-empty `base_activity_offering.description` with `base_consent` (`activity_waiver`) persistence after booking create; cancel-only edit semantics (no session reschedule)
- authority: [`docs/requirements/PR19-activity-booking.md`](../requirements/PR19-activity-booking.md)
- backend freeze: None — BA10 booking RPC + offering/session/booking/`base_consent` tables PASS (portal-backend-ready-report)
- contract (Evidence only): BASE BA10/BA11 per PR19 overview
- QA advisory (non-blocking): portal-backend-ready-report suggests consuming base-backend-ready-report for BA09–BA16 edge artefacts if PR19 cross-checks ingest boundaries
- implementation: route `/:eventSlug/activities` in [`src/App.tsx`](../src/App.tsx) via [`EventActivityBookingRoute`](../src/pages/events/EventFormRoutes.tsx); page [`ActivityBookingPage.tsx`](../src/pages/events/ActivityBookingPage.tsx); view [`ActivityBookingView.tsx`](../src/components/events/ActivityBookingView.tsx); hook [`useActivityBooking.ts`](../src/hooks/events/useActivityBooking.ts); lib [`activityBookingTypes.ts`](../src/lib/activityBookingTypes.ts), [`activityBookingRules.ts`](../src/lib/activityBookingRules.ts), [`activityBookingConsent.ts`](../src/lib/activityBookingConsent.ts), [`fetchActivityBookingBrowse.ts`](../src/lib/fetchActivityBookingBrowse.ts), [`fetchActivityWaiverConsents.ts`](../src/lib/fetchActivityWaiverConsents.ts), [`fetchParticipantBookings.ts`](../src/lib/fetchParticipantBookings.ts), [`validateActivityBooking.ts`](../src/lib/validateActivityBooking.ts), [`persistActivityBookingConsent.ts`](../src/lib/persistActivityBookingConsent.ts), [`activityBookingRpc.ts`](../src/lib/activityBookingRpc.ts); hub handoff [`EventHubActivitiesSection.tsx`](../src/components/events/EventHubActivitiesSection.tsx); path helper `eventActivityBookingPath` in [`eventFormPaths.ts`](../src/routing/eventFormPaths.ts)
- tests: [`activityBookingContracts.test.ts`](../src/lib/activityBookingContracts.test.ts), [`activityBookingConsent.test.ts`](../src/lib/activityBookingConsent.test.ts), [`activityBookingRpc.test.ts`](../src/lib/activityBookingRpc.test.ts), [`useActivityBooking.test.tsx`](../src/hooks/events/useActivityBooking.test.tsx), [`ActivityBookingPage.test.tsx`](../src/pages/events/ActivityBookingPage.test.tsx), [`EventHubActivitiesSection.test.tsx`](../src/components/events/EventHubActivitiesSection.test.tsx), [`eventFormPaths.test.ts`](../src/routing/eventFormPaths.test.ts)
- validate: `npm run validate` — PASS (`audit/202605191916-*` step reports + `audit/202605191917-pace-core-audit.md`)

### PR21 — Participant itinerary

- acceptance: none — see [`PR21-participant-itinerary.md`](../requirements/PR21-participant-itinerary.md)
- authority: [`docs/requirements/PR21-participant-itinerary.md`](../requirements/PR21-participant-itinerary.md)
- backend freeze: TRAC SLICE-05 participant read contract + CR26 derivation helper (portal-backend-ready-report cross-check)
- implementation: not started — no `/:eventSlug/itinerary` route or `ParticipantItineraryPage` in `src/` yet
- tests: none

### PR22 — My Memberships

- acceptance: all eleven acceptance criteria in [`PR22-my-memberships.md`](../requirements/PR22-my-memberships.md) marked complete
- authority: [`docs/requirements/PR22-my-memberships.md`](../requirements/PR22-my-memberships.md)
- backend freeze: **PORTAL-DB-001**, **PORTAL-DB-002**, **PORTAL-DB-003** — my-memberships guard + `app_submit_member_request` draft link + joinable org search RPC verified (portal-backend-ready-report PORTAL deltas + RPC table)
- contract (Evidence only): TEAM TM01 member request architecture owns RPC semantics PR22 consumes (`app_submit_member_request`, etc.) — see PR22 References
- implementation: route `/my-memberships` in [`src/App.tsx`](../src/App.tsx); page [`MyMembershipsPage.tsx`](../src/pages/memberships/MyMembershipsPage.tsx); view [`MyMembershipsView.tsx`](../src/components/memberships/MyMembershipsView.tsx); hooks [`useMembershipList.ts`](../src/hooks/memberships/useMembershipList.ts), [`useMemberRequestFlow.ts`](../src/hooks/memberships/useMemberRequestFlow.ts); lib [`memberRequestTypes.ts`](../src/lib/memberRequestTypes.ts), [`deriveMembershipDisplayState.ts`](../src/lib/deriveMembershipDisplayState.ts), [`fetchMembershipList.ts`](../src/lib/fetchMembershipList.ts), [`searchJoinableOrganisations.ts`](../src/lib/searchJoinableOrganisations.ts), [`fetchOrgMembershipTypes.ts`](../src/lib/fetchOrgMembershipTypes.ts), [`fetchOrgSignupForm.ts`](../src/lib/fetchOrgSignupForm.ts), [`validateMemberRequestPreSubmit.ts`](../src/lib/validateMemberRequestPreSubmit.ts), [`persistOrgSignupFormResponse.ts`](../src/lib/persistOrgSignupFormResponse.ts), [`memberRequestRpc.ts`](../src/lib/memberRequestRpc.ts), [`submitMemberRequestFlow.ts`](../src/lib/submitMemberRequestFlow.ts); wizard fallback [`buildCompletionPath`](../src/hooks/auth/profileWizardShell.ts) → `/my-memberships`; reserved slug in [`eventFormPaths.ts`](../src/routing/eventFormPaths.ts)
- tests: [`deriveMembershipDisplayState.test.ts`](../src/lib/deriveMembershipDisplayState.test.ts), [`validateMemberRequestPreSubmit.test.ts`](../src/lib/validateMemberRequestPreSubmit.test.ts), [`memberRequestRpc.test.ts`](../src/lib/memberRequestRpc.test.ts), [`fetchOrgMembershipTypes.test.ts`](../src/lib/fetchOrgMembershipTypes.test.ts), [`fetchMembershipList.test.ts`](../src/lib/fetchMembershipList.test.ts), [`searchJoinableOrganisations.test.ts`](../src/lib/searchJoinableOrganisations.test.ts), [`submitMemberRequestFlow.test.ts`](../src/lib/submitMemberRequestFlow.test.ts), [`useMembershipList.test.tsx`](../src/hooks/memberships/useMembershipList.test.tsx), [`useMemberRequestFlow.test.tsx`](../src/hooks/memberships/useMemberRequestFlow.test.tsx), [`MyMembershipsPage.test.tsx`](../src/pages/memberships/MyMembershipsPage.test.tsx), [`MembershipStateCard.test.tsx`](../src/components/memberships/MembershipStateCard.test.tsx), [`profileWizardShell.test.ts`](../src/hooks/auth/profileWizardShell.test.ts), [`eventFormPaths.test.ts`](../src/routing/eventFormPaths.test.ts)
- validate: `npm run validate` — PASS (`audit/202605201833-*` step reports + `audit/202605201901-pace-core-audit.md`)
