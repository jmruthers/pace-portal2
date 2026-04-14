# PR04 — Register placeholder

## Filename convention

This file is **`PR04-register-placeholder.md`** — portal requirement slice **PR04** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: repurpose `/register` into a generic public self-service account creation entry route with a placeholder page and clear linkage from login.
- Dependencies: this route depends on the PR01 shell contract for public routing and redirect behavior.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the current page reads `eventSlug` and `formSlug` from the query string, loads the matching event and form through `useEventFormLanding`, redirects authenticated users to `/profile-complete` or `/dashboard` depending on whether event context exists, performs a full `supabase.auth.signUp` flow, calls `createPersonAfterRegistration`, attempts to create `core_person` and RBAC membership records, shows a success state, and then hard redirects to profile completion or dashboard. If the event or form context cannot be loaded, the page shows an error.
- Rebuild delta: keep `/register` as a single public page in this active slice, remove the event and form dependency from the rebuild target, make the page a generic self-service account creation placeholder, keep the route suitable for future replacement by a dedicated self-service auth implementation, and keep all real sign-up, bootstrap, profile-completion, and event-form continuation logic outside this active slice.

## Acceptance criteria

- [ ] A public visitor can open `/register` without event or form context.
- [ ] The page presents generic placeholder content for future self-service account creation.
- [ ] Existing sessions are redirected away from the public registration page.
- [ ] The login surface links users without a PACE account to `/register`.
- [ ] No event-aware redirect or bootstrap behavior is implied by the rebuilt `/register` page.
- [ ] No payment or billing behavior is introduced.

## API / Contract

- Public exports: the `/register` route contract and the placeholder registration page.
- File paths: `src/pages/auth/public/RegistrationPage.tsx` (public auth surface; pace-core audit treats `pages/**/public/**` as intentionally unguarded) and the `/register` route wiring in `src/App.tsx`.
- Data contracts: the rebuilt route must not depend on event or form context, and it must not require registration bootstrap, person creation, or RBAC membership mutation contracts.
- Permission and context contracts: the route is public; if a session already exists, the page must redirect instead of presenting account creation; the login page must continue linking to `/register`.

## Visual specification

- Component layout and composition: a placeholder `/register` page with generic self-service account creation copy and a login-linked call to action.
- States: public placeholder state, authenticated-user redirect away from the page, and any minimal loading state needed while session status is checked.
- Authoritative visual recipe: keep the page generic and non-event-specific so it can later be replaced by a real self-service auth experience without changing the route contract.

## Verification

- A visitor can open `/register` without query params or app context.
- An authenticated user is redirected away from `/register`.
- The login surface links to `/register`.
- Event and form query params do not change the placeholder content.

## Testing requirements

- Cover already-authenticated redirect behavior, generic placeholder rendering without query params, login-to-register navigation, and ignoring event or form query params.
- Cover the absence of event-aware bootstrap behavior and the absence of payment or billing behavior.

## Do not

- Do not absorb profile-completion UI, event handoff logic, or real sign-up/bootstrap behavior into this slice.
- Do not reintroduce event-aware registration behavior unless a later requirement explicitly restores it.
- Do not introduce billing or payment behavior.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/auth/public/RegistrationPage.tsx`
- `src/App.tsx`
- `./PR00-portal-project-brief.md`
- `./PR00-portal-architecture.md`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
