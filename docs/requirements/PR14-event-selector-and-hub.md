# PR14 — Event selector and participant hub

## Filename convention

This file is **`PR14-event-selector-and-hub.md`** — portal requirement slice **PR14** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---

## Overview

- Purpose and scope: rebuild the dashboard-side event selector and participant event-hub handoff for the active rebuild wave.
- Dependencies: **PR03** (dashboard must expose the event-selector slot that this slice replaces); `pace-core` layout, buttons, cards, badges, file display, and auth/context primitives; event and form resolution contracts; dashboard event surface used for application state transitions.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the dashboard event cards already surface `Apply`, `Manage`, `Plan`, and `Setup` actions depending on state; management details are shown in a modal.
- Rebuild delta: replace the placeholder `EventList` interaction built in PR03 with the resolved `Apply` / `Resume` / `Manage/Open` flow, keep `Resume` on the same authenticated application path as `Apply`, and move non-draft participants into a dedicated participant event-hub page (`/:eventSlug`) rather than a modal-only management surface.

## Acceptance criteria

- [ ] The slice replaces the placeholder `EventList` interaction from PR03 with the resolved dashboard-side `Apply` / `Resume` / `Manage` flow.
- [ ] The dashboard event selector shows `Apply` when no application exists, `Resume` when a draft application exists, and `Manage` when an application exists with any non-`draft` status.
- [ ] `Resume` routes to the same authenticated application path as `Apply`.
- [ ] `Manage`/open routes to `/:eventSlug` (participant event hub) and not a modal-only dead-end.
- [ ] The participant event hub page shows event name, logo, dates, participant blurb, admin email, website (when present), application status, and active forms/workflow links without `context_id` grouping.
- [ ] Missing event, inactive-window, and logo-fallback states are visible and testable on selector/hub surfaces.
- [ ] The dashboard event list shows **only** events that have at least one **published** form that is active (not deactivated) and within its open window, scoped to organisations the user can access (see **Dashboard event list visibility** below).
- [ ] When no event qualifies, the dashboard events section is empty while other landing sections still load.

## API / Contract

### Dashboard event list visibility (normative)

- **Eligibility:** Show a dashboard event card **only if** the event has at least one qualifying form row in `core_forms`.
- **Organisation scope:** Consider only forms whose `organisation_id` is in the same set of organisations the user may access for enhanced landing (membership / RBAC-derived list used by `useEnhancedLanding`).
- **Qualifying form (“open” for members):**
  - **`status = 'published'`** — product meaning of “open”; `draft` and `closed` do not count.
  - **`event_id` is non-null** and identifies the event row in `core_events`.
  - **`is_active` is not `false`** (both `true` and `null` are allowed).
  - **Time window** evaluated at request time: if `opens_at` is set, it must be **≤ now**; if `closes_at` is set, it must be **≥ now**; if either bound is `null`, that side imposes no restriction (both null ⇒ not time-gated).
- **Implementation note:** If authenticated `core_forms` reads are blocked by RLS, resolve via a pace-core2 RPC or policy change; do not silently show all org events.

- Public exports: `src/pages/events/EventHubPage.tsx`, `src/hooks/events/useEventHub.ts`, `src/hooks/events/useFileReferences.ts`, `src/components/events/EventList.tsx`, and the dashboard event composition in `src/pages/DashboardPage.tsx` / `src/shared/hooks/useEnhancedLanding.ts` where applicable.
- Public service contracts: event lookup, application-status action mapping (`Apply`/`Resume`/`Manage`), event-hub data assembly, and authenticated handoff routes must remain typed and explicit.
- File paths under the app: `src/pages/events/EventHubPage.tsx`, `src/hooks/events/useEventHub.ts`, `src/hooks/events/useFileReferences.ts`, `src/components/events/EventList.tsx`, `src/pages/DashboardPage.tsx`, `src/shared/hooks/useEnhancedLanding.ts`.
- Data contracts: `core_events`, `core_forms`, `core_file_references`, `base_application`, `data_file_reference_list`, plus event metadata fields needed by the participant hub (blurb/admin email/website) where present.
- ID contract: event-hub and dashboard action boundaries in this slice should use `EventId`, `OrganisationId`, `AppId`, and `PageId` from `@solvera/pace-core/types` where slug resolution, application lookup, organisation context, and page-permission identifiers cross service seams.
- File-display contract: event selector and event hub are authenticated surfaces and should resolve logos with authenticated file display helpers (`FileDisplay` / `useFileDisplay`) rather than bespoke URL assembly.
- Theming contract: do not apply `applyPalette`, `getPaletteFromEvent`, `getPaletteFromOrganisation`, or `clearPalette` in this slice during the rebuild; event and organisation palette theming is explicitly out of scope for the current wave.
- Permission and context contracts: dashboard and event-hub actions require authenticated user context and any RBAC context supplied by `UnifiedAuth`; authenticated `PaceAppLayout` usage in this slice must follow `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`.
- Ownership rule: `PR14` owns the `useFileReferences` hook as the event-logo file-reference resolver for dashboard event-entry and participant event-hub surfaces. Later event slices may depend on that contract, but they do not own the hook definition.

## Visual specification

- Component layout and composition: authenticated dashboard event cards with action buttons, plus participant event-hub page with event summary/details and workflow links.
- States: loading, invalid slug, event not found, inactive-window, logo fallback, and empty form list.
- Authoritative visual recipe: use `Card`, `Button`, `Badge`, `Alert`, and authenticated `FileDisplay`; preserve the current `Apply` / `Resume` / `Manage` distinction in CTA treatment, with `Manage` opening the hub page.
- Globals: follow `pace-core` Standard 07 Part A and Part C for shared visual behavior rather than restating global layout rules here.

## Verification

- Verify the dashboard event selector renders the correct action state for no application, draft application, and submitted/non-draft application cases.
- Verify `Manage` routes to `/:eventSlug` and hub content renders required event summary fields and active forms.
- Verify authenticated event-logo rendering works on dashboard and hub surfaces via authenticated file-display primitives.

## Testing requirements

- Required automated coverage: unit coverage for action-state mapping/file-reference resolution and integration coverage for dashboard selector + event-hub routing.
- Required scenarios: `Apply` / `Resume` / `Manage` state derivation, logo fallback, missing event, inactive form window, RLS or RPC failure, and event-hub content rendering.
- Dashboard event list: unit tests for **published / draft / closed**, **`is_active` false vs null/true**, and **`opens_at` / `closes_at`** boundary and null semantics; integration or orchestration tests ensuring `fetchEnhancedLanding` (or equivalent) only returns events with a qualifying form across accessible organisations.

## Do not

- Do not remove the dashboard-side event selector from this rebuild wave.
- Do not group event-hub workflow links by `context_id`.
- Do not keep `Manage` as modal-only UX; it must route to the participant event hub page.
- Do not add dynamic event or organisation palette theming in this slice unless a later requirement explicitly brings it into scope.
- Do not drop the existing event metadata, logo, or open-form behavior unless a separate requirement explicitly replaces it.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [pace-portal architecture](./PR00-portal-architecture.md)
- [PR01 app shell routing](./PR01-app-shell-routing.md) (redirect-after-sign-in)
- [PaceAppLayout constraint](./PR00-portal-architecture.md#paceapplayout-and-appswitcher)
- [Portal app manifest](./PR00-portal-architecture.md#route-ownership-and-matching-model)
- [Portal domain map](./PR00-portal-architecture.md)
- [Portal slice index / legacy mapping](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)
- `src/pages/events/EventHubPage.tsx`
- `src/hooks/events/useEventHub.ts`
- `src/hooks/events/useFileReferences.ts`
- `src/components/events/EventList.tsx`
- `src/pages/DashboardPage.tsx`
- `src/shared/hooks/useEnhancedLanding.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
