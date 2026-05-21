# PR16 QA Pack

## Slice metadata

- slice_id: PR16
- app: portal
- requirement_path: docs/requirements/PR16-event-application-submission.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /:eventSlug/:formSlug | 1) Complete and submit an event form for a response-first draft without legacy draft base_application. | Application is created or updated through the submit path and user sees success feedback. | - | Partial: legacy draft base_application rows may return APPLICATION_RPC_FAILED until migration |
| S-02 (AC-02) | /:eventSlug/:formSlug | 1) Submit form with valid answers. | Form response and response-value rows save successfully before or as part of final submit. | - | - |
| S-03 (AC-03) | /:eventSlug/:formSlug | 1) Submit draft workflow. 2) Attempt duplicate submit on already-submitted application. | Draft transitions to submitted without duplicate submitted applications for response-first drafts; duplicate submit shows DUPLICATE_SUBMIT_PREVENTED style messaging. | - | Partial: legacy draft base_application path not auto-transitioned |
| S-04 (AC-04) | /:eventSlug/:formSlug | 1) Submit event form while in proxy mode for a target person. | Submission succeeds using target person context with same success UX as self-service when valid. | - | - |
| S-05 (AC-05) | /:eventSlug/:formSlug | 1) Attempt submit without required organisation context. | Clear error is shown; no success toast or redirect home. | - | - |
| S-06 (AC-06) | /:eventSlug/:formSlug | 1) Trigger PARTIAL_PERSISTENCE failure scenario if reproducible. 2) Attempt double submit and retry after failure. | Destructive toast and no redirect on partial persistence; double submit does not show false success or duplicate submitted applications. | - | PARTIAL_PERSISTENCE: orphan base_application possible after RPC success per requirement |
| S-07 (Verification) | /:eventSlug/:formSlug | 1) Submit valid form end-to-end. | Success toast appears and user is redirected to /. | - | - |
| S-08 (Verification) | /:eventSlug/:formSlug | 1) Rapidly double-click submit on happy path. | Only one submitted application outcome is presented to the user without duplicate success navigation. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
