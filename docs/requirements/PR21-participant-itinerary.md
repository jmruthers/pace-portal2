# PR21 — Participant itinerary

## Filename convention

This file is **`PR21-participant-itinerary.md`** — portal requirement slice **PR21** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---

## Overview

- Purpose and scope: define the portal-hosted member-facing itinerary page for participants who are already scoped in portal for an event.
- Dependencies: PR01 app shell routing, PR14 event selector and participant hub, portal auth/context contracts, [CR26-shared-itinerary-derivation-helper.md](/Users/kusi/Documents/GitHub/pace-core2/packages/core/docs/requirements/CR26-shared-itinerary-derivation-helper.md), and the participant itinerary contract documented in `/Users/kusi/Documents/GitHub/pace-trac/rebuild/architecture.md`, `/Users/kusi/Documents/GitHub/pace-trac/rebuild/slices/SLICE-05-requirements.md`, `/Users/kusi/Documents/GitHub/pace-trac/rebuild/feature-list.md`, and `/Users/kusi/Documents/GitHub/pace-trac/rebuild/user-stories.md`.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Rebuild intent: add a simple authenticated member route at `/:eventSlug/itinerary`, entered from the participant event hub or event details surface, without turning portal into a second TRAC planner app.

## Acceptance criteria

- [ ] The portal documents an authenticated member-facing route at `/:eventSlug/itinerary`.
- [ ] The primary entry point for the route is the participant event hub or event details surface owned by PR14.
- [ ] The page is for participants already scoped in portal for the event and does not require TRAC RBAC.
- [ ] The page shows only that participant's assigned logistics and remains read-only in v1.
- [ ] The route consumes the same TRAC SLICE-05 participant rules: Option A logistics `SELECT` RLS assumption, participant-only assignment filter, same status filter (`trac_status IN ('booked', 'confirmed')`), same day-entry rules, same timezone precedence rules, and same in-day ordering rules.
- [ ] The route consumes the shared pure itinerary derivation helper (CR26) from pace-core2 for day-entry expansion, timezone precedence, visible date range/day grouping, and in-day ordering rather than re-implementing those rules locally.
- [ ] v1 remains list-first and simple; map support is not required.
- [ ] Users without scoped participant itinerary data for the event receive a clear explanatory state rather than planner-oriented or empty-screen behavior.

## API / Contract

- Public exports: `src/pages/events/ParticipantItineraryPage.tsx`, `src/hooks/events/useParticipantItinerary.ts`, and any list/grouping components extracted specifically for the participant itinerary route.
- Public service contracts: participant itinerary reads must remain typed, read-only, participant-scoped, and behaviorally aligned with the TRAC SLICE-05 participant contract even if portal uses its own adapter or wrapper hook. The portal route must consume the same participant-scoped read model assumptions and the shared pure itinerary derivation helper from pace-core2 rather than inventing a portal-only variant.
- File paths under the app: `src/pages/events/*`, `src/components/events/*`, `src/hooks/events/*`.
- Data contracts: participant context from portal event scoping and `base_application`, plus participant-safe reads of `trac_itinerary_assignment`, `trac_transport`, `trac_accommodation`, and `trac_activity` under the documented Option A assumptions. Event timezone defaults or event metadata used for day derivation must stay aligned with the TRAC contract.
- Route ownership: `PR21` owns `/:eventSlug/itinerary` and the page contract for participant itinerary display. `PR14` owns only the workflow link or action that points to this route from `/:eventSlug`.

### Participant scope and security contract (normative)

- The portal itinerary page is only for a participant who is already scoped in portal for the active event.
- The page must show only logistics assigned to that participant.
- The route is read-only in v1.
- The route must not require TRAC `itinerary` page permission, must not mint a TRAC token, and must not use a public URL or `SECURITY DEFINER` bypass.
- The portal route is a member-facing consumer of the existing TRAC participant itinerary contract; it does not create a second TRAC route and does not bypass the TRAC `/itinerary` page guard.
- pace-core2 owns the shared pure derivation helper contract; portal owns route composition and must not fork the derivation rules in page-local utilities.

### Participant read-path contract from TRAC SLICE-05 (normative)

- **RLS assumption:** reads rely on the TRAC Option A post-change state where logistics `SELECT` is allowed when the viewer has a matching itinerary assignment for their `base_application`; portal must not document an alternate bypass path.
- **Participant filter:** assignment scope is participant-only. The route must not expose unassigned logistics or other participants' assignments.
- **Status filter:** only logistics rows with `trac_status IN ('booked', 'confirmed')` are shown. Rows with status `idea`, `planned`, `dropped`, or `cancelled` must not appear on the participant itinerary. This filter is applied at the Supabase query layer before rows are passed to CR26. (Confirmed TRAC SLICE-05 Q-01, Kusi 2026-05-19.)
- **`eventDefaultTimezone`:** the CR26 `eventDefaultTimezone` parameter must be passed as `null`. There is no `event_timezone` column on `core_events`; the timestamp fields on each logistics row carry timezone information and CR26 falls back to UTC where timezone data is absent. Do not attempt to derive an event-level timezone from `core_events` or pass a hardcoded value. (Confirmed TRAC SLICE-05 Q-02, Kusi 2026-05-19.)
- **Day-entry rules:**
  - Transport appears on the departure local day and on the arrival local day when those days differ.
  - Activity appears on the start local day and on the finish local day when those days differ.
  - Accommodation appears on every local day from check-in through check-out inclusive.
  - Each resource renders at most once per local day.
- **Timezone precedence rules:**
  - Transport departure-day uses departure snapshot timezone, otherwise event default timezone, otherwise UTC.
  - Transport arrival-day uses arrival snapshot timezone, otherwise departure snapshot timezone, otherwise event default timezone, otherwise UTC.
  - Activity start-day uses start-location snapshot timezone, otherwise event default timezone, otherwise UTC.
  - Activity finish-day uses finish-location snapshot timezone, otherwise start-location snapshot timezone, otherwise event default timezone, otherwise UTC.
  - Accommodation occupied days use accommodation snapshot timezone, otherwise event default timezone, otherwise UTC.
- **In-day ordering rules:**
  - Transport departure-day entries sort by `departure_time`.
  - Transport arrival-day entries sort by `arrival_time` when they render on a different local day to departure.
  - Activity start-day entries sort by `start_time`.
  - Activity finish-day entries sort by `finish_time` when they render on a different local day to start.
  - Accommodation check-in day sorts by `check_in_time`.
  - Accommodation check-out day sorts by `check_out_time` when it renders on a different local day to check-in.
  - Accommodation intermediate occupied days render without a primary timestamp and sort after timestamped entries for that day.
  - Final tie-break within a day is resource type, then stable id.

## Visual specification

- Component layout and composition: event-context header plus a day-grouped itinerary list for the scoped participant.
- States: loading, scoped participant with itinerary rows, scoped participant with no assigned rows, unscoped participant/day-visitor explanatory state, and access-denied or failed-read state.
- Authoritative visual recipe: keep v1 list-first and simple. Use standard authenticated portal page chrome, cards, badges, alerts, and list primitives. A map, planner controls, or assignment-management affordances are not required in the first documented version.

## Verification

- Verify navigation from `/:eventSlug` to `/:eventSlug/itinerary` through the hub action.
- Verify a scoped participant sees only their own assigned logistics.
- Verify a participant without itinerary rows or without eligible participant scope gets explanatory copy rather than planner UI.
- Verify day grouping, timezone precedence, and in-day ordering match the TRAC SLICE-05 participant contract and the shared pace-core2 helper contract.

## Testing requirements

- Required automated coverage: integration coverage for hub-to-route navigation, participant-scoped read behavior, and read-only rendering. Prefer fixture coverage against the shared pace-core2 helper contract rather than portal-local pure derivation helpers.
- Required scenarios: participant with assigned transport/accommodation/activity rows, multi-day rows, participant with no assignments, participant without eligible scope for the event, denied or failed read path, and route matching against `/:eventSlug/:formSlug`.
- Required assertions: tests must confirm no planner-only controls, assignment CRUD, or broader TRAC planner concepts appear on the route.

## Slice boundaries

- `PR14` owns dashboard event-card state, participant event-hub composition, and the `View itinerary` hub link.
- `PR21` owns the `/:eventSlug/itinerary` route, participant itinerary page contract, and portal wording for the TRAC SLICE-05 participant rules while consuming the shared pace-core2 helper from CR26.
- PR15–PR17 continue to own authenticated event-form and submit behavior; PR21 must not absorb form-journey responsibilities.

## Do not

- Do not turn portal into a second TRAC planner app.
- Do not add planning, assignment CRUD, or broader TRAC planner concepts to this route.
- Do not require map support for v1.
- Do not describe the itinerary as a modal-only interaction.
- Do not invent a TRAC token, public URL, or `SECURITY DEFINER` bypass.
- Do not add a dedicated participant-only TRAC route in portal docs.
- Do not document rules that drift from the TRAC SLICE-05 participant contract.
- Do not fork the shared itinerary derivation logic in portal-local helpers when CR26 exists to own that contract.

## References

- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [pace-portal architecture](./PR00-portal-architecture.md)
- [PR01-app-shell-routing.md](./PR01-app-shell-routing.md)
- [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md)
- [CR26-shared-itinerary-derivation-helper.md](/Users/kusi/Documents/GitHub/pace-core2/packages/core/docs/requirements/CR26-shared-itinerary-derivation-helper.md)
- `/Users/kusi/Documents/GitHub/pace-trac/rebuild/architecture.md`
- `/Users/kusi/Documents/GitHub/pace-trac/rebuild/slices/SLICE-05-requirements.md`
- `/Users/kusi/Documents/GitHub/pace-trac/rebuild/feature-list.md`
- `/Users/kusi/Documents/GitHub/pace-trac/rebuild/user-stories.md`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md) · Cursor rules · ESLint config · this requirements doc.
