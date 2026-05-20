# PR14 QA Pack

## Slice metadata

- slice_id: PR14
- app: portal
- requirement_path: docs/requirements/PR14-event-selector-and-hub.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /dashboard | 1) Open /dashboard event selector. | Placeholder EventList interaction is replaced with Apply, Resume, and Manage/Open actions per application state. | - | - |
| S-02 | AC-02 | /dashboard | 1) View events with no application, draft application, and non-draft application. | Cards show Apply, Resume, and Manage respectively for each state. | - | - |
| S-03 | AC-03 | /dashboard | 1) Click Resume on an event with draft application. | Navigation uses the same authenticated application path as Apply. | - | - |
| S-04 | AC-04 | /dashboard, /:eventSlug | 1) Click Manage or Open on an event with non-draft application. | User routes to /:eventSlug participant hub, not a modal-only dead-end. | - | - |
| S-05 | AC-05 | /:eventSlug | 1) Open hub for a known event. | Hub shows event name, logo, dates, participant blurb, admin email, website when present, application status, and active workflow links without context_id grouping. | - | - |
| S-06 | AC-06 | /:eventSlug | 1) Open hub as a participant already scoped for the event. | View itinerary link or action is visible and navigates toward /:eventSlug/itinerary. | - | - |
| S-07 | AC-07 | /dashboard, /:eventSlug | 1) Exercise invalid slug, inactive window, and missing logo test data. | Missing event, inactive-window, and logo-fallback states are visible and understandable on selector and hub. | - | - |
| S-08 | AC-08 | /dashboard | 1) Sign in as user with mix of qualifying and non-qualifying events. | Dashboard list shows only events with at least one published active in-window form in accessible orgs. | - | - |
| S-09 | AC-09 | /dashboard | 1) Sign in as user with no qualifying events. | Events section is empty while other dashboard sections still load. | - | - |
| S-10 | Verification | /dashboard, /:eventSlug | 1) Inspect event logos on dashboard cards and hub header. | Logos render via authenticated file display without broken image placeholders when references exist. | - | Hub mounted outside PortalAuthenticatedLayout per build-queue; access via ProtectedRoute and org gate |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
