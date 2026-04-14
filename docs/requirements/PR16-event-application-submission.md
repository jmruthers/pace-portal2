# PR16 — Event application submission

## Filename convention

This file is **`PR16-event-application-submission.md`** — portal requirement slice **PR16** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the final application save and submit path so event forms write the expected application and response records, transition draft workflows to submitted state, and return the user to the dashboard after success.
- Dependencies: `pace-core` feedback and navigation patterns where they fit; draft-application support; proxy-mode person resolution; response and response-value persistence; application create/update helpers.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 08 Testing/Documentation, 09 Operations (user-safe messages; avoid logging PII on client failure paths).
- Current baseline behavior: the page groups submitted values by table, upserts or inserts the backing records, ensures a `base_application` row exists or is updated for event forms, creates `core_form_responses` and `core_form_response_values` rows, shows toast feedback, navigates back to `/`, and sanitizes errors for development logging.
- Rebuild delta: keep submission as the final authenticated form step, preserve the current persistence contract, make draft-to-submitted transition rules explicit, keep proxy-mode handling and organisation-context checks explicit, and hide the persistence orchestration behind a narrow service/helper boundary so the page stays thin and testable.

## Acceptance criteria

- [ ] Submitting an event form creates or updates the application record.
- [ ] Form response and response-value rows are written successfully.
- [ ] A draft workflow transitions to submitted state without leaving duplicate applications behind.
- [ ] Proxy-mode submission uses the target person correctly.
- [ ] The user gets a clear error when organisation context is missing.
- [ ] Partial-failure cases do not report success or leave orphaned rows presented as a completed submit.
- [ ] Successful submission redirects the user back to the dashboard.

## API / Contract

- Public exports: `src/pages/events/FormFillPage.tsx`, `src/hooks/events/useApplicationSubmission.ts`, `src/hooks/events/useDraftApplication.ts`, and the submit branch inside `src/components/events/FormRenderer.tsx`.
- Public service contracts: application create/update, response persistence, draft-to-submitted transition, and duplicate-safe submission semantics must be exposed through a narrow event-application helper or service boundary.
- File paths under the app: `src/pages/events/FormFillPage.tsx`, `src/hooks/events/useApplicationSubmission.ts`, `src/hooks/events/useDraftApplication.ts`, `src/components/events/FormRenderer.tsx`.
- Data contracts: `base_application`, `core_form_responses`, `core_form_response_values`, form-backed tables targeted by `FormData`, `app_base_application_create`, proxy-mode person resolution, and the idempotency / duplicate-prevention strategy used by the submit path.
- ID contract: submission boundaries in this slice should use `UserId`, `OrganisationId`, `EventId`, `AppId`, and `PageId` from `@solvera/pace-core/types` where acting user, target member, organisation, event, application, and guarded-page identifiers are passed through submission services.
- Result contract: submission helpers in this slice should return `ApiResult<T>` from `@solvera/pace-core/types` and use `ok`, `err`, `isOk`, and `isErr` for submit success, duplicate-prevention, and failure branches instead of ad hoc result shapes.
- **Idempotency and duplicate-safe submit (normative):**
  - **Draft reuse:** Before creating a new `base_application` row for an event form, load existing rows for the same **acting context** (self or proxy target person per hooks), event, and form scope; **reuse** the draft row when status is `draft` instead of inserting duplicates.
  - **Submit / double-click / retry:** Final submit must be safe under **repeated calls** (second click, network retry). Rely on **database uniqueness / RPC semantics** documented for the target Supabase project (e.g. one non-draft application per member/event/form combination) plus application code that treats “already submitted” as **`DUPLICATE_SUBMIT_PREVENTED`** (success or controlled `err` per table below), not as a silent second insert.
  - **Partial failure:** If any persistence step fails after another succeeded, return `err` with code **`PARTIAL_PERSISTENCE`**; **do not** show success toast or navigate home. Roll back or compensate per schema capabilities; document any unavoidable orphan-row handling in implementation notes for the target repo.
- **`ApiResult` error taxonomy (stable `error` string identifiers for automation/tests):**

| Code | When to use |
| --- | --- |
| `MISSING_ORG_CONTEXT` | Organisation context required for writes is absent. |
| `PROXY_RESOLUTION_FAILED` | Proxy target person could not be resolved or validated for submission. |
| `VALIDATION_FAILED` | Server-side validation or RPC rejected payload (map user-safe message). |
| `APPLICATION_RPC_FAILED` | `app_base_application_create` or equivalent RPC failed (non-partial). |
| `RESPONSE_PERSISTENCE_FAILED` | Application row ok but response/response-value write failed. |
| `PARTIAL_PERSISTENCE` | Mixed success/failure across tables; user must retry or contact support—never success UX. |
| `DUPLICATE_SUBMIT_PREVENTED` | Idempotent guard detected an existing submitted application or duplicate submit. |

Use these exact identifiers in `err(...)` payloads (or attach as `error.code` if the shared `ApiResult` error object supports structured metadata) so tests and Cursor implementations stay aligned.
- Permission and context contracts: authenticated user context is required, proxy mode must be respected, organisation context must exist before writes, and acting-user vs target-member attribution must remain explicit for delegated submission.

## Visual specification

- Component layout and composition: submit button on the authenticated form page, submit-in-progress state, success toast and redirect, and destructive error toast.
- States: idle, submitting, success, duplicate-prevention / retry, missing-organisation, proxy-resolution failure, and partial-persistence failure.
- Authoritative visual recipe: keep the submit surface inside the authenticated form experience and use `pace-core` feedback and navigation patterns where they already fit.
- Globals: follow `pace-core` Standard 07 Part A and Part C for shared visual behavior when this slice inherits page chrome from the form flow.

## Verification

- Verify a successful submit writes the application and response records and then returns the user to `/`.
- Verify proxy-mode submission reaches the same success path using the target person.
- Verify missing organisation context blocks submission with a clear error and no false success state.
- Verify **double submit** and **retry after RPC failure** do not create duplicate submitted applications or show success on `PARTIAL_PERSISTENCE`.

## Testing requirements

- Required automated coverage: unit coverage for the submit helper, integration coverage for the form page submit branch, and regression coverage for duplicate-prevention behavior.
- Required scenarios: happy-path submit, proxy submit, existing-application update, missing-organisation failure, application RPC failure, partial response-write failure, and duplicate-safe retry behavior.
- Required assertions: submission tests should exercise both `ApiResult` success and failure branches so form-level error handling stays consistent with the shared service contract.

## Slice boundaries

- **PR15** owns authenticated form page shell, field rendering, draft load/save, and profile gates. **PR16** owns final **submit** orchestration (`useApplicationSubmission`), `ApiResult` branches, and duplicate-safe draft→submitted transitions. Shared files (`FormFillPage.tsx`, `FormRenderer.tsx`, `useDraftApplication.ts`) may change in both slices: coordinate so draft persistence stays in **PR15**’s contract and submit persistence stays in **PR16**’s helper boundary.

## Do not

- Do not leave submission orchestration embedded as a large opaque block inside the page component.
- Do not return bespoke submission result objects when `ApiResult<T>` is the documented shared contract.
- Do not report success after a partial persistence failure.
- Do not create duplicate applications when a draft or submitted application already exists.
- Do not weaken proxy-mode or organisation-context checks.
- Do not log **PII** (names, emails, health data, full payloads) to the client console on failure; follow Standard **09 Operations** for user-safe surfaces and developer diagnostics.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [pace-portal architecture](./PR00-portal-architecture.md)
- `src/pages/events/FormFillPage.tsx`
- `src/hooks/events/useApplicationSubmission.ts`
- `src/hooks/events/useDraftApplication.ts`
- `src/components/events/FormRenderer.tsx`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
