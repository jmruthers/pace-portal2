# PR14 QA Pack

## Slice metadata

- slice_id: PR14
- app: portal
- requirement_path: docs/requirements/PR14-event-selector-and-hub.md

## Manual frontend scenarios


| scenario            | route_or_screen         | steps                                                                             | expected_result                                                                                                                                                     | result | notes                                                                                                 |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| S-01 (AC-01)        | /dashboard              | 1) Open /dashboard event selector.                                                | Placeholder EventList interaction is replaced with Apply, Resume, and Manage/Open actions per application state.                                                    | Pass   | -                                                                                                     |
| S-02 (AC-02)        | /dashboard              | 1) View events with no application, draft application, and non-draft application. | Cards show Apply, Resume, and Manage respectively for each state.                                                                                                   | Pass   | -                                                                                                     |
| S-03 (AC-03)        | /dashboard              | 1) Click Resume on an event with draft application.                               | Navigation uses the same authenticated application path as Apply.                                                                                                   | Pass   | -                                                                                                     |
| S-04 (AC-04)        | /dashboard, /:eventSlug | 1) Click Manage or Open on an event with non-draft application.                   | User routes to /:eventSlug participant hub, not a modal-only dead-end.                                                                                              | Pass   | -                                                                                                     |
| S-05 (AC-05)        | /:eventSlug             | 1) Open hub for a known event.                                                    | Hub shows event name, logo, dates, participant blurb, admin email, website when present, application status, and active workflow links without context_id grouping. | Pass   | -                                                                                                     |
| S-06 (AC-06)        | /:eventSlug             | 1) Open hub as a participant already scoped for the event.                        | View itinerary link or action is visible and navigates toward /:eventSlug/itinerary.                                                                                | Pass   | -                                                                                                     |
| S-07 (AC-07)        | /dashboard, /:eventSlug | 1) Exercise invalid slug, inactive window, and missing logo test data.            | Missing event, inactive-window, and logo-fallback states are visible and understandable on selector and hub.                                                        | Pass   | -                                                                                                     |
| S-08 (AC-08)        | /dashboard              | 1) Sign in as user with mix of qualifying and non-qualifying events.              | Dashboard list shows only events with at least one published active in-window form in accessible orgs.                                                              | Pass   | -                                                                                                     |
| S-09 (AC-09)        | /dashboard              | 1) Sign in as user with no qualifying events.                                     | Events section is empty while other dashboard sections still load.                                                                                                  | Pass   | -                                                                                                     |
| S-10 (Verification) | /dashboard, /:eventSlug | 1) Inspect event logos on dashboard cards and hub header.                         | Logos render via authenticated file display without broken image placeholders when references exist; hub shows portal header/nav inside authenticated shell.          | Pass   | -     |


## Test run summary

- overall result: **Pass** — 10/10 manual scenarios passed (S-01 through S-10).
- failed scenarios: None.
- defect links: None recorded for this run.
- retest needed: No — slice meets PR14 acceptance criteria for manual frontend verification (dashboard event selector actions, application-state routing, participant hub content and itinerary link, error and empty states, qualifying-event visibility, and authenticated logo display).

