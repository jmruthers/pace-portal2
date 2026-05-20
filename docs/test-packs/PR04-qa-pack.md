# PR04 QA Pack

## Slice metadata

- slice_id: PR04
- app: portal
- requirement_path: docs/requirements/PR04-register-placeholder.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /register | 1) Sign out. 2) Open /register with no query parameters. | Placeholder registration page renders without requiring event or form context. | - | - |
| S-02 | AC-02 | /register | 1) Open /register as a visitor. | Page shows generic self-service account creation placeholder copy suitable for future auth implementation. | - | - |
| S-03 | AC-03 | /register | 1) Sign in. 2) Navigate to /register. | Authenticated user is redirected away from the public registration page. | - | - |
| S-04 | AC-04 | /login | 1) Open /login. 2) Follow the link for users without a PACE account. | Navigation reaches /register. | - | - |
| S-05 | AC-05 | /register | 1) Open /register with eventSlug and formSlug query params if supported. | Placeholder content stays generic; no event-aware bootstrap, sign-up, or person-creation flow runs. | - | - |
| S-06 | AC-06 | /register | 1) Inspect /register page content and actions. | No payment or billing behavior is introduced on the placeholder page. | - | - |
| S-07 | Verification | /register | 1) Open /register with and without optional query params. | Content remains the same generic placeholder; query params do not change copy or trigger event form loading. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
