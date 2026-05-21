# PR02 QA Pack

## Slice metadata

- slice_id: PR02
- app: portal
- requirement_path: docs/requirements/PR02-shared-services-hooks.md

## Manual frontend scenarios


| scenario            | route_or_screen                                                | steps                                                                                                                                                                  | expected_result                                                                                                                                                                | result | notes |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| S-01 (AC-01)        | /dashboard                                                     | 1) Sign in. 2) Open /dashboard and compare visible profile, contacts, and event summary data to the prior portal baseline for the same user.                           | Landing and consumer pages show equivalent successful domain payloads (profile, categorized events, contacts summaries) without missing sections attributable to shared hooks. | Pass   | -     |
| S-02 (AC-02)        | /member-profile                                                | 1) Open /member-profile. 2) Simulate a recoverable load error if possible (e.g. temporary network loss) and reload.                                                    | Loading states, cached reload behavior, and user-safe error messages match prior portal behavior; failures do not crash the page.                                              | Pass   | -     |
| S-03 (AC-03)        | /member-profile                                                | 1) Open /member-profile and inspect reference-data driven selects (gender, pronoun, phone type, membership type). 2) Navigate away and return within the same session. | Reference options load without repeated long delays; selects remain populated from cached reference data.                                                                      | Pass   | -     |
| S-04 (AC-04)        | /dashboard                                                     | 1) Open /dashboard twice in quick succession or reload within 30 seconds.                                                                                              | Second load reuses cached user data without duplicate visible loading churn beyond expected spinners.                                                                          | Pass   | -     |
| S-05 (AC-05)        | /profile/edit/:memberId                                        | 1) From /dashboard, open a linked profile with edit access. 2) Observe proxy banner and target member context.                                                         | Proxy session validates before delegated workspace loads; invalid proxy state is cleared rather than showing another member's data.                                            | Pass   | -     |
| S-06 (AC-06)        | /profile/edit/:memberId                                        | 1) Enter delegated edit mode for a target member. 2) Start a save on /member-profile or medical/contacts surfaces reachable from the delegated workspace.              | UI shows delegated target context sufficient for downstream writes to attribute to the target member, not only the signed-in user.                                             | Pass   | -     |
| S-07 (AC-07)        | /dashboard                                                     | 1) Open /dashboard for a user with accessible events. 2) Compare event cards to events that lack a published active in-window form.                                    | Dashboard event list shows only PR14-qualified events, not every core_events row in accessible orgs.                                                                           | Pass   | -     |
| S-08 (AC-08)        | /login                                                         | 1) Attempt navigation to protected routes with unsafe redirect query values if the UI exposes them. 2) Observe slug-based event links with invalid slugs.              | Unsafe redirect or slug values are rejected or sanitized without exposing internal errors or navigating to arbitrary URLs.                                                     | Pass   | -     |
| S-09 (AC-09)        | /login                                                         | 1) Sign in once. 2) Navigate across dashboard and member routes during the same auth session.                                                                          | Login history records once per auth session without duplicate page-level login recording prompts or errors.                                                                    | Pass   | -     |
| S-10 (AC-10)        | /dashboard                                                     | 1) Inspect dashboard and related consumer routes for billing entry points.                                                                                             | No payment helper or billing surfaces appear on dashboard, profile, contacts, or event consumer flows.                                                                         | Pass   | -     |
| S-11 (Verification) | /dashboard, /member-profile, /additional-contacts, /:eventSlug | 1) Exercise dashboard landing, member profile load, additional contacts list, and an event workflow entry in one session.                                              | Each consuming flow continues to work without contract changes visible to the member (loads, saves, navigation).                                                               | Pass   | -     |
| S-12 (Verification) | /dashboard, /profile/edit/:memberId                            | 1) Rapidly reload dashboard. 2) Enter and exit invalid proxy state if test data allows. 3) Observe dashboard aggregation under organisation or access failure.         | Cache dedupe, proxy invalidation cleanup, dashboard aggregation, and reduced-field fallback behave safely without blank protected pages or unauthorized data.                  | Pass   | -     |


## Test run summary

- overall result: Pass (12/12 scenarios)
- failed scenarios: None
- defect links: None recorded in this pack
- retest needed: None

