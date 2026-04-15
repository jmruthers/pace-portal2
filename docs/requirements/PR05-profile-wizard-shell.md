# PR05 — Profile wizard shell

## Filename convention

This file is **`PR05-profile-wizard-shell.md`** — portal requirement slice **PR05** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define the `/profile-complete` shell as the protected step framework, progress indicator, validation gate, loading state, and redirect orchestration for profile completion.
- Dependencies: PR01 app shell (including **`OrganisationServiceProvider`** in [`src/main.tsx`](../../src/main.tsx) — required so `useProfileCompletionWizard` receives `selectedOrganisation.id` and can run `fetchCurrentPersonMember`) and PR02 shared services; this slice consumes `useProfileCompletionWizard`, `useReferenceData`, `fetchUserData`, `usePhoneNumbers`, `useAddressData`, and the optional Google Places preload helper.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the route is nested under the app’s **`ProtectedRoute`** (session required) and wrapped in **`ProfileCompleteLayout`** (minimal chrome without main nav). It does **not** use **`PagePermissionGuard`**: `rbac_check_permission_simplified` does not grant an org-admin bypass on that path, so missing `rbac_page_permissions` rows for `profile-complete` would block onboarding for all roles. Access control for this flow is therefore **authentication + organisation context** for persistence, not per-page RBAC read. The page reads `eventSlug` and `formSlug` from query params, preloads profile data and reference data, optionally preloads Google Maps Places when an API key exists, renders a 3-step progress shell, blocks advancement on validation failure, saves through the wizard hook, and redirects to `/:eventSlug/:formSlug?fromWizard=true` or `/dashboard`.
- Rebuild delta: keep the route and shell contract stable while isolating step content and persistence details in PR06; preserve prefilled person/member/phone/address data, validation failures, save failure states, and the current event handoff semantics.
- Ownership boundary: PR05 owns the exported `/profile-complete` page shell, route guard integration, progress and step navigation chrome, redirect orchestration, and the step-orchestration surface of `useProfileCompletionWizard`; PR06 owns the field-group implementations, step-content rendering, and detailed persistence behavior that the shell composes.

## Acceptance criteria

- [x] `/profile-complete` renders only for authenticated users: the route is declared under `ProtectedRoute` in `src/App.tsx` (session required). Per-page **`PagePermissionGuard`** is intentionally not used here (see Overview).
- [x] The wizard shows a stable 3-step shell with progress feedback and clear current-step state.
- [x] Existing profile data is prefilling the shell when available.
- [x] Validation prevents advancing when shell-level required checks fail.
- [x] Save and continue behavior preserves the current redirect outcomes for event handoff and dashboard completion.
- [x] Loading, validation failure, save failure, and cancel states are represented clearly.

## API / Contract

- Public exports: `/profile-complete`, `ProfileCompletionWizardPage`, `useProfileCompletionWizard`, `useReferenceData`, `fetchUserData`, `usePhoneNumbers`, `useAddressData`, and `loadGoogleMapsWithPlaces`.
- File paths: `src/pages/ProfileCompletionWizardPage.tsx` (wizard shell page), `src/hooks/auth/useProfileCompletionWizard.ts`, `src/hooks/auth/profileWizardShell.ts` (shell validation helpers), `src/shared/hooks/useReferenceData.ts`, `src/shared/lib/utils/userUtils.ts` (`fetchUserData` alias), `src/hooks/contacts/usePhoneNumbers.ts`, `src/hooks/shared/useAddressData.ts`, `src/integrations/google-maps/loader.ts`.
- Data contracts: `core_person`, `core_member`, `core_phone`, and `core_address` are the persistence seams behind the shell; query-param handoff uses `eventSlug`, `formSlug`, and the `fromWizard=true` return flag.
- Permission and context contracts: authenticated route via **`ProtectedRoute`**, optional **`ProfileCompleteLayout`**, current user/session context, selected organisation context for data loads/saves, and event-form handoff query params. **`PagePermissionGuard`** is not applied on this route (see Overview); this slice does not define organisation-wide RBAC policy tables.
- Ownership rule: edits in this slice should stay limited to the exported page shell, shell-level loading and redirect behavior, progress and action-row orchestration, and the `useProfileCompletionWizard` surface that coordinates steps. Step body rendering, field-level validation, and save-shape detail belong to PR06 even when they live behind the same hook.

## Visual specification

- Component layout and composition: protected page container, loading state, step header, progress bar, step indicator, and the action row that presents Cancel, Skip, Previous, Next, and Complete Profile states.
- States: loading while reference or existing data is being resolved; validation errors when required shell checks fail; save in progress; save failure toast; cancel/navigation fallback.
- Authoritative visual recipe: keep the shell focused on orchestration only. Field groups, detailed step content, and persistence affordances belong in PR06.
- Globals: cite pace-core Standard 07 for shared visual behavior rather than restating global styling rules here.

## Verification

- Verify the route opens from the protected shell and shows loading before profile and reference data are ready.
- Verify the step indicator and progress bar advance only after validation passes and a successful save completes.
- Verify the final completion redirect returns to the event form with `fromWizard=true` when `eventSlug` and `formSlug` are present.
- Verify the fallback redirect goes to `/dashboard` when no event handoff exists.
- Verify the cancel path returns to `/dashboard`.

## Testing requirements

- Required automated coverage: shell mounting, guard behavior, progress calculation, step advancement gating, save orchestration, and redirect handling.
- Required scenarios: no existing person or member record, missing Google Places API key, unresolved address lookup, event handoff via query params, validation failure, save failure, and delayed final redirect after the success toast.

## Slice boundaries

- **PR05** owns `/profile-complete` page chrome: auth route (`ProtectedRoute`), layout (`ProfileCompleteLayout`), step progress, navigation between steps, save/continue orchestration, and redirects.
- **PR06** owns field groups, step-body validation, and persistence mapping inside the wizard. Shared files (`ProfileCompletionWizardPage.tsx`, `useProfileCompletionWizard.ts`) may change in both slices: **PR05** coordinates steps and redirects; **PR06** owns field-level behavior inside each step.

## Do not

- Do not pull field-group detail or step persistence into the shell contract.
- Do not add billing, payment, or invoice behavior to this flow.
- Do not change the current route shape or event-handoff redirect contract.
- Do not render event forms inside this shell.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Field detail slice: [PR06-wizard-field-details.md](./PR06-wizard-field-details.md)
- `src/pages/ProfileCompletionWizardPage.tsx`
- `src/hooks/auth/useProfileCompletionWizard.ts`
- `src/shared/lib/profileProgress.ts`
- `src/shared/hooks/useReferenceData.ts`
- `src/shared/lib/utils/userUtils.ts`
- `src/hooks/contacts/usePhoneNumbers.ts`
- `src/hooks/shared/useAddressData.ts`
- `src/integrations/google-maps/loader.ts`
- `src/App.tsx` (protected route wiring for `profile-complete`)
- `src/shared/components/ProfileCompleteLayout.tsx` (layout shell for the wizard route)

### Manual QA (not automated)

Track in release notes or tick when verified in a deployed or local build:

- [ ] Route requires sign-in; unauthenticated users are redirected to login.
- [ ] Loading shows before profile and reference data are ready.
- [ ] Step indicator and progress advance only after validation passes and save succeeds (where applicable).
- [ ] Completion redirect includes `fromWizard=true` when `eventSlug` and `formSlug` query params are set.
- [ ] Fallback completion redirect goes to `/dashboard` when handoff params are absent.
- [ ] Cancel returns to `/dashboard`.

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
