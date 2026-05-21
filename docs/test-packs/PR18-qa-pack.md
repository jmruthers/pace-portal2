# PR18 QA Pack

## Slice metadata

- slice_id: PR18
- app: portal
- requirement_path: docs/requirements/PR18-application-progress.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /:eventSlug/applications/:applicationId | 1) From a submitted event form journey, follow deep link or navigate directly with known application id. | Route renders application progress page under event workflow path. | - | - |
| S-02 (AC-02) | /:eventSlug/applications/:applicationId | 1) Open progress page for application with pending and completed checks. | Application status and participant-visible approval-check progress display with checks ordered by sort_order. | - | - |
| S-03 (AC-03) | /:eventSlug/applications/:applicationId | 1) Inspect page content for token, organiser-only, or internal fields. | No token_hash, token expiry internals, or privileged organiser-only controls are visible to the participant. | - | - |
| S-04 (AC-04) | /:eventSlug/:formSlug | 1) Submit event form to submitted state. 2) Use journey link to application progress. | Non-draft submitted applications can deep-link to the progress page from form journey. | - | - |
| S-05 (Verification) | /:eventSlug/applications/:applicationId | 1) Open progress page with happy-path pending and completed checks. 2) Open with unauthorized application id. | Happy path shows status and checks; unauthorized access shows safe denied or error state without sensitive fields. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
