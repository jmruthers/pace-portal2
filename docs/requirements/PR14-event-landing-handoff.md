# PR14 — Event landing handoff

## Filename convention

This file is **`PR14-event-landing-handoff.md`** — portal requirement slice **PR14** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the public event/form landing experience and the dashboard-side event selector that leads into authenticated event management for the active rebuild wave.
- Dependencies: **PR03** (dashboard must expose the event-selector slot that this slice replaces); `pace-core` layout, buttons, cards, badges, dialogs, file display, and auth/context primitives; event and form resolution contracts; the dashboard event surface used for application state transitions.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the landing page validates event and form slugs, resolves visible events and active forms, enforces open-window checks, renders event metadata and logo from file references/storage, and currently sends users toward `/register` with slug context; the dashboard event cards already surface `Apply`, `Manage`, `Plan`, and `Setup` actions depending on state.
- Rebuild delta: keep the public landing route and dashboard selector in this wave, replace the placeholder `EventList` interaction built in PR03 with the resolved dashboard-side `Apply` / `Resume` / `Manage` flow, route landing users into sign-in rather than `/register`, preserve slug context through the handoff, make `Apply` / `Resume` / `Manage` state distinctions explicit, keep `Resume` on the same authenticated application path as `Apply`, keep the management surface modal-based and simplified rather than grouped by `context_id`, and explicitly leave pace-core dynamic event or organisation palette theming out of this rebuild wave unless a later requirement adds it.

## Acceptance criteria

- [ ] A public visitor can land on `/:eventSlug/:formSlug` and see the current event and form metadata when the slugs resolve.
- [ ] The landing-page handoff preserves event and form context and routes users into sign-in instead of `/register`.
- [ ] The slice replaces the placeholder `EventList` interaction from PR03 with the resolved dashboard-side `Apply` / `Resume` / `Manage` flow.
- [ ] The dashboard event selector shows `Apply` when no application exists, `Resume` when a draft application exists, and `Manage` when an application exists with any non-`draft` status.
- [ ] `Resume` routes to the same authenticated application path as `Apply`.
- [ ] The manage modal shows event name, logo, dates, application status, and active published forms without `context_id` grouping.
- [ ] Missing event, missing form, inactive-window, and logo-fallback states are visible and testable.

## API / Contract

- Public exports: `src/pages/events/EventFormLandingPage.tsx`, `src/hooks/events/useEventFormLanding.ts`, `src/hooks/events/useFileReferences.ts`, `src/components/events/EventList.tsx`, `src/components/events/EventManageDialog.tsx`, and the dashboard event composition in `src/pages/DashboardPage.tsx` / `src/shared/hooks/useEnhancedLanding.ts` where applicable.
- Public service contracts: landing-page slug validation, event/form lookup, **file-reference resolution and display URLs via `usePublicFileDisplay`** (and the `useFileReferences` contract in this slice)—**no ad-hoc storage URL string assembly**—dashboard action-state selection, and sign-in handoff must remain typed and explicit.
- File paths under the app: `src/pages/events/EventFormLandingPage.tsx`, `src/hooks/events/useEventFormLanding.ts`, `src/hooks/events/useFileReferences.ts`, `src/components/events/EventList.tsx`, `src/components/events/EventManageDialog.tsx`, `src/pages/DashboardPage.tsx`, `src/shared/hooks/useEnhancedLanding.ts`.
- Data contracts: `core_events`, `core_forms`, `core_file_references`, `base_application`, `data_file_reference_list`, and the `public-files` storage bucket used for event logos.
- ID contract: event-landing and dashboard action boundaries in this slice should use `EventId`, `OrganisationId`, `AppId`, and `PageId` from `@solvera/pace-core/types` where slug resolution, application lookup, organisation context, and page-permission identifiers cross service seams.
- File-display contract: the unauthenticated landing page should resolve event logos with `usePublicFileDisplay` from `@solvera/pace-core/hooks` against the `public-files` bucket instead of hand-rolled storage URL logic; authenticated dashboard and manage surfaces may continue to use `FileDisplay` or authenticated file-display helpers.

### Sign-in handoff (normative; aligns with PR01)

- **Goal:** An unauthenticated visitor on `/:eventSlug/:formSlug` uses a **Sign in** (or equivalent) CTA and, after successful authentication, returns to **the same path** so PR15 can load the authenticated branch—matching [PR01-app-shell-routing.md](./PR01-app-shell-routing.md) (**intended redirects survive a successful sign-in flow**).
- **Return path encoding:** Navigate to `/login` with a **single path-only** return parameter, e.g. `redirect`, whose value is percent-encoded **same-origin** path starting with `/` (example: `/login?redirect=%2F{eventSlug}%2F{formSlug}`). Reject values that are not same-origin path-only (use shared redirect validation from `inputValidation` / PR02—no open redirects).
- **Post-login:** After session establishment, the app **replaces** the route with the decoded path (preserving `eventSlug` and `formSlug`). Do not drop slug context in sessionStorage unless used only as a fallback when the query param is absent.
- **Interaction with register:** Landing must **not** send users to `/register` for this handoff in the rebuild target (see **Do not** below).
- Theming contract: do not apply `applyPalette`, `getPaletteFromEvent`, `getPaletteFromOrganisation`, or `clearPalette` in this slice during the rebuild; event and organisation palette theming is explicitly out of scope for the current wave.
- Permission and context contracts: the landing page must work without authenticated user context; dashboard event actions require authenticated user context and any RBAC context supplied by `UnifiedAuth`; authenticated `PaceAppLayout` usage in this slice must follow `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`.
- Ownership rule: `PR14` owns the `useFileReferences` hook as the event-logo file-reference resolver for the public landing and dashboard event-entry surfaces. Later event slices may depend on that contract, but they do not own the hook definition.

## Visual specification

- Component layout and composition: public landing page with a PACE header, prominent event card, event logo, event/form title, description, date range, location, sign-in CTA, and footer; authenticated dashboard event cards with action buttons and a modal-based manage surface.
- States: loading, invalid slug, event not found, form not found, inactive-window, logo fallback, empty form list, and public-access/RLS failure.
- Authoritative visual recipe: use `Card`, `Button`, `Badge`, `Dialog`, `Alert`, and `Footer` primitives; use `usePublicFileDisplay` for public event-logo rendering and `FileDisplay` only on authenticated event surfaces; keep the manage surface simple and modal-based; preserve the current `Apply` / `Resume` / `Manage` distinction in the CTA treatment.
- Globals: follow `pace-core` Standard 07 Part A and Part C for shared visual behavior rather than restating global layout rules here.

## Verification

- Verify `/:eventSlug/:formSlug` as an unauthenticated entry point and confirm the CTA hands off to sign-in with slug context intact.
- Verify the dashboard event selector renders the correct action state for no application, draft application, and submitted/non-draft application cases.
- Verify the manage modal opens from the dashboard surface and shows the required event summary and active forms.
- Verify public event-logo rendering works without an authenticated session, while authenticated dashboard event surfaces continue to render logos through authenticated file-display primitives.

## Testing requirements

- Required automated coverage: unit coverage for slug generation/state mapping/file-reference resolution, integration coverage for the landing-page handoff, and dashboard coverage for the selector state machine.
- Required scenarios: happy-path landing, sign-in handoff, `Apply` / `Resume` / `Manage` state derivation, logo fallback, missing form, inactive form window, RLS or RPC failure, and manage-modal content rendering.

## Do not

- Do not send users from the landing page directly into `/register` in the rebuild target.
- Do not remove the dashboard-side event selector from this rebuild wave.
- Do not group the manage surface by `context_id`.
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
- `src/pages/events/EventFormLandingPage.tsx`
- `src/hooks/events/useEventFormLanding.ts`
- `src/hooks/events/useFileReferences.ts`
- `src/components/events/EventList.tsx`
- `src/components/events/EventManageDialog.tsx`
- `src/pages/DashboardPage.tsx`
- `src/shared/hooks/useEnhancedLanding.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
