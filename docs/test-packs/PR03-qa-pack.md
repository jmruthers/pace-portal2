# PR03 QA Pack

## Slice metadata

- slice_id: PR03
- app: portal
- requirement_path: docs/requirements/PR03-dashboard-composition.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /dashboard | 1) Sign in. 2) Open /dashboard. | Contact summary, profile prompts, event selector slot, and linked profiles render in the same non-payment composition order as the current portal. | - | - |
| S-02 | AC-02 | /dashboard | 1) Open /dashboard during initial load. 2) Use a user lacking dashboard/read permission if available. 3) Use a user with no person record. | Loading spinner, AccessDenied fallback, and profile-setup prompt each render explicitly for their conditions. | - | - |
| S-03 | AC-03 | /dashboard | 1) Open /dashboard as a user without dashboard/read. | PagePermissionGuard blocks composed content and shows AccessDenied before cards render. | - | - |
| S-04 | AC-04 | /dashboard | 1) Land on /dashboard. 2) Navigate away and return. | Landing data refetches on mount so dashboard content reflects latest profile and event state. | - | - |
| S-05 | AC-05 | /dashboard | 1) On contact summary, open profile photo upload. 2) Upload a valid JPG, PNG, or WebP within 5 MB. | Upload entry point is available; valid image types are accepted. | - | TM02 profile-photo cross-check advisory per portal-build-queue |
| S-06 | AC-06 | /dashboard | 1) Attempt upload with unsupported type or file over 5 MB. | Upload is rejected with clear feedback before or on save; avatar does not update with invalid file. | - | - |
| S-07 | AC-07 | /dashboard | 1) Complete a successful profile photo upload. | Avatar updates without full page reload. | - | TM02 profile-photo cross-check advisory per portal-build-queue |
| S-08 | AC-08 | /dashboard | 1) Inspect dashboard sections. | SmartBillingCard and other billing surfaces are absent from the active rebuild dashboard. | - | - |
| S-09 | AC-09 | /dashboard | 1) Observe event selector on dashboard. | EventList card-and-panel interaction is present as the composable event-selector slot (Apply/Resume/Manage handoff owned by PR14). | - | - |
| S-10 | Verification | /, /dashboard | 1) Open / and /dashboard. | Both render the same protected landing experience. | - | - |
| S-11 | Verification | /dashboard | 1) Exercise prompts, linked profiles, and event entry loading and error states. | Each section shows consistent loading, empty, error, denied, or success states without breaking the page. | - | - |
| S-12 | Verification | /dashboard, /member-profile | 1) Upload a valid profile photo. 2) Edit member profile and return to dashboard. | Avatar refresh and updated profile data are visible on dashboard after returning from edit. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
