# PR21 QA Pack

## Slice metadata

- slice_id: PR21
- app: portal
- requirement_path: docs/requirements/PR21-participant-itinerary.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /:eventSlug/itinerary | 1) Sign in as scoped participant. 2) Navigate to /:eventSlug/itinerary for a known event slug. | Authenticated member-facing itinerary route is available at the documented path. | - | - |
| S-02 | AC-02 | /:eventSlug | 1) Open participant event hub as scoped participant. 2) Use View itinerary entry. | Primary entry from hub or event details navigates to /:eventSlug/itinerary. | - | - |
| S-03 | AC-03 | /:eventSlug/itinerary | 1) Open itinerary as participant already scoped in portal for the event. | Page loads without TRAC planner chrome or TRAC RBAC requirements for participants. | - | - |
| S-04 | AC-04 | /:eventSlug/itinerary | 1) View itinerary for scoped participant with assigned logistics. | Only that participant's assigned logistics appear; page is read-only with no planner or assignment controls. | - | - |
| S-05 | AC-05 | /:eventSlug/itinerary | 1) View itinerary with mixed transport, activity, and accommodation assignments including multi-day rows. | Only booked and confirmed status logistics appear, grouped by day per TRAC SLICE-05 participant rules via shared derivation helper. | - | - |
| S-06 | AC-06 | /:eventSlug/itinerary | 1) Compare day grouping, timezone precedence, and within-day ordering to TRAC participant contract test fixtures. | Day entries, timezone precedence, and in-day ordering match documented participant contract behavior. | - | - |
| S-07 | AC-07 | /:eventSlug/itinerary | 1) Open itinerary page layout. | v1 list-first simple day-grouped itinerary renders without map or planner affordances. | - | - |
| S-08 | AC-08 | /:eventSlug/itinerary | 1) Open itinerary as participant without eligible scoped data or with no assigned rows. | Clear explanatory empty or unscoped state renders instead of planner UI or blank screen. | - | - |
| S-09 | Verification | /:eventSlug/itinerary | 1) Navigate from /:eventSlug hub link. 2) Attempt direct URL with invalid slug. | Hub handoff reaches itinerary route; invalid slug shows appropriate not-found or access state without planner controls. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
