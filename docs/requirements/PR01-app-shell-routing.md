# PR01 — App shell routing

## Filename convention

This file is **`PR01-app-shell-routing.md`** — portal requirement slice **PR01** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the portal runtime shell so the app boots with the correct providers, route guards, layouts, and lazy-loaded page entry points for the active non-payment portal surfaces.
- Dependencies: this slice is the foundation for every other portal slice; downstream slices depend on the route map, providers, and shell contracts defined here.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 08 Testing/Documentation, 09 Operations.
- Current baseline behavior: `src/main.tsx` sets `APP_NAME` to `PACE`, configures RBAC with the base Supabase client before any RBAC-dependent route renders, mounts `QueryClientProvider`, `BrowserRouter`, `UnifiedAuthProvider`, `TooltipProvider`, and `Toaster`, and redirects idle users to `/login`. `src/App.tsx` lazy-loads the portal pages, wraps protected shells in `PaceAppLayout`, keeps `/login` and `/register` public, and resolves event workflow routes with auth-required handoff when no session is present.
- Rebuild delta: preserve the current non-payment route set and aliases, keep public and protected boundaries explicit, keep lazy loading and global error/loading behavior centralized, keep the profile-complete shell separate from the main chrome, configure `UnifiedAuthProvider` with the full inactivity contract rather than `dangerouslyDisableInactivity: true`, render `InactivityWarningModal` from `@solvera/pace-core/components` through `renderInactivityWarning`, use `useSessionRestoration` with `SessionRestorationLoader` from `@solvera/pace-core/components` during auth restore instead of a generic spinner, and exclude payment and invoice routes and nav from the active rebuild wave.
- **Implementation note (pace-portal):** `APP_NAME` for RBAC/auth is shared via `src/constants.ts` (`pace`); global toasts use `ToastProvider` from pace-core; authenticated chrome uses `PortalAuthenticatedLayout` / `ProfileCompleteLayout` (see PR00) in place of a single `PaceAppLayout` symbol; unauthenticated visitors on `/:eventSlug/:formSlug` are redirected to `/login?redirect=…` for return-URL preservation; event hub and application placeholders live in `src/pages/public/EventWorkflowPlaceholders.tsx`; `LoginHistoryRecorder` mounts under `OrganisationServiceProvider` for PR02 login history.

## Acceptance criteria

- [x] The app boots with RBAC configured before any RBAC-dependent route renders.
- [x] Public routes render without requiring auth context.
- [x] Protected routes are gated behind the appropriate auth and organisation context loading checks.
- [x] The shell renders the same non-payment route aliases as the current portal.
- [x] The login surface includes a route into `/register`.
- [x] The main app layout uses the shared authenticated shell contract (`PortalAuthenticatedLayout`), and the profile-complete shell uses the shared navigation-free authenticated shell contract (`ProfileCompleteLayout`) aligned with `PaceAppLayout` behavior.
- [x] `UnifiedAuthProvider` uses the full inactivity configuration (`idleTimeoutMs`, `warnBeforeMs`, `onIdleLogout`, and `renderInactivityWarning`) rather than disabling inactivity protection.
- [x] Session restoration uses `useSessionRestoration` and `SessionRestorationLoader` instead of a generic protected-route loading spinner.
- [x] The shell keeps the global error boundary, suspense fallback, and toaster.
- [x] Intended redirects survive a successful sign-in flow.
- [x] Idle timeout, explicit sign-out, and session expiry return the user to `/login`.
- [x] Payment and invoice routes and nav are not part of the active rebuild slice.

## API / Contract

- Public exports: `APP_NAME`, root app bootstrap, protected route shells, `DashboardPage`, `MemberProfilePage`, `MedicalProfilePage`, `AdditionalContactsPage`, `ProfileCompletionWizardPage`, `ProfileViewPage`, `ProfileEditProxyPage`, `FormFillPage`, `RegistrationPage`, and `NotFoundPage`.
- File paths: `src/main.tsx`, `src/App.tsx`, `src/lib/supabase.ts`, `src/shared/components/AppErrorBoundary.tsx`, and the routed page modules under `src/pages/*`.
- Data contracts: `setupRBAC(supabaseClient, ...)` must run before any protected route renders; the root shell must configure the TanStack Query client, auth provider, tooltip provider, and suspense/error fallback once; `UnifiedAuthProvider` should use the stable `@solvera/pace-core` import path and must be configured with `idleTimeoutMs`, `warnBeforeMs`, `onIdleLogout`, and `renderInactivityWarning` for the rebuild target; `renderInactivityWarning` should render `InactivityWarningModal` from `@solvera/pace-core/components`; auth restore should use `useSessionRestoration` from `@solvera/pace-core/hooks` and `SessionRestorationLoader` from `@solvera/pace-core/components`; `PaceAppLayout` usage must follow the shared portal constraint in `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`; the portal RBAC surface must follow `./PR00-portal-architecture.md#rbac-and-route-permission-model`; the active route contract includes `/login`, `/register`, `/profile-complete`, `/`, `/dashboard`, `/member-profile`, `/medical-profile`, `/additional-contacts`, `/profile/view/:memberId`, `/profile/edit/:memberId`, `/:eventSlug`, `/:eventSlug/application`, and `/:eventSlug/:formSlug`.
- Permission and context contracts: auth entry routes stay accessible without a session; event workflow routes support auth-required handoff with return URL preservation; protected routes must continue to honor auth and organisation context; the profile-complete shell must stay isolated from the main navigation chrome; shell-level auth handling must clear protected context on sign-out, idle timeout, or session expiry; page-level permissions must use the exact portal RBAC names documented in `./PR00-portal-architecture.md#rbac-and-route-permission-model`; reserved route matching must prevent generic event-form matching from swallowing `/login`, `/register`, `/dashboard`, `/profile-complete`, delegated profile routes, or `/:eventSlug/application`.

## Visual specification

- Component layout and composition: login page, self-service account-creation placeholder page, auth-required event handoff, participant event-hub page, profile-completion shell, dashboard shell, member profile shell, medical profile shell, additional contacts shell, profile view/edit shells, and not-found page.
- States: `SessionRestorationLoader` during auth restore, inactivity warning modal before forced logout, suspense fallback for lazy routes, error boundary fallback, and not-found fallback.
- Authoritative visual recipe: use the shared authenticated shell contracts (`PortalAuthenticatedLayout` and `ProfileCompleteLayout`) as the top-level layouts for protected flows, with a navigation-free variant for `/profile-complete`; keep the shell thin and avoid duplicating loading or error chrome in page modules; the main authenticated chrome should include `AppSwitcher` at the top left of the header so signed-in portal users can move into other PACE apps, while `/profile-complete` remains navigation-free.

## Verification

- App boot reaches `/login`, `/dashboard`, `/profile-complete`, `/:eventSlug`, `/:eventSlug/application`, and `/:eventSlug/:formSlug` with the expected shell behavior.
- Sign-in, sign-out, idle-timeout, not-found, and loading/error fallbacks can be exercised without feature-level business logic being present.
- Verify `/` and `/dashboard` resolve to the same dashboard surface.
- Verify `AppSwitcher` is visible at the top left of the main authenticated shell, is populated from the signed-in user's available app set, and is absent from the navigation-free `/profile-complete` shell.

## Testing requirements

- Cover provider mounting, public/protected route gating, auth-loading behavior, session-restoration loading behavior, reserved-route matching, shell-level error boundaries, global toaster mounting, and inactivity-warning rendering.
- Cover the protected route aliases, lazy loading, idle logout redirect to `/login`, the configured inactivity warning path, `AppSwitcher` visibility and access-aware item population on authenticated shells, and removal of payment routes and nav from the active shell.

## Do not

- Do not let feature pages each invent their own auth, loading, provider, or error-boundary setup.
- Do not carry deferred payment routes, payment profile navigation, or invoice routes into the active rebuild wave.
- Do not place `AppSwitcher` on public routes or the navigation-free `/profile-complete` shell.
- Do not hide route or shared-data contracts inside oversized page components.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Portal RBAC constraint](./PR00-portal-architecture.md#rbac-and-route-permission-model)
- `src/main.tsx`
- `src/App.tsx`
- `src/shared/components/AppErrorBoundary.tsx`
- `src/lib/supabase.ts`
- `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`
- `./PR00-portal-project-brief.md`
- `./PR00-portal-architecture.md`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
