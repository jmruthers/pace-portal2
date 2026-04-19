# PR05 — Profile wizard shell

## Filename convention

This file is **`PR05-profile-wizard-shell.md`** — portal requirement slice **PR05** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define the `/profile-complete` shell as the protected step framework, progress indicator, validation gate, loading state, and redirect orchestration for profile completion.
- Dependencies: PR01 app shell and PR02 shared services; this slice consumes `useProfileCompletionWizard`, `useReferenceData`, `fetchUserData`, `usePhoneNumbers`, `useAddressData`, and the optional Google Places preload helper.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the route is wrapped in `PagePermissionGuard`, reads `eventSlug` and `formSlug` from query params, preloads profile data and reference data, optionally preloads Google Maps Places when an API key exists, renders a 3-step progress shell, blocks advancement on validation failure, saves through the wizard hook, and redirects to `/:eventSlug/:formSlug?fromWizard=true` or `/dashboard`.
- Rebuild delta: keep the route and shell contract stable while isolating step content and persistence details in PR06; preserve prefilled person/member/phone/address data, validation failures, save failure states, and the current event handoff semantics.
- Ownership boundary: PR05 owns the exported `/profile-complete` page shell, route guard integration, progress and step navigation chrome, redirect orchestration, and the step-orchestration surface of `useProfileCompletionWizard`; PR06 owns the field-group implementations, step-content rendering, and detailed persistence behavior that the shell composes.

## Acceptance criteria

- [x] `/profile-complete` renders only for authenticated users behind the current page guard.
- [x] The wizard shows a stable 3-step shell with progress feedback and clear current-step state.
- [x] Existing profile data is prefilling the shell when available.
- [x] Validation prevents advancing when shell-level required checks fail.
- [x] Save and continue behavior preserves the current redirect outcomes for event handoff and dashboard completion.
- [x] Loading, validation failure, save failure, and cancel states are represented clearly.

## API / Contract

- Public exports: `/profile-complete`, `ProfileCompletionWizardPage`, `useProfileCompletionWizard`, `useReferenceData`, `fetchUserData`, `usePhoneNumbers`, `useAddressData`, and `loadGoogleMapsWithPlaces`.
- File paths: `src/pages/auth/ProfileCompletionWizardPage.tsx`, `src/hooks/auth/useProfileCompletionWizard.ts`, `src/shared/hooks/useReferenceData.ts`, `src/shared/lib/utils/userUtils.ts`, `src/hooks/contacts/usePhoneNumbers.ts`, `src/hooks/shared/useAddressData.ts`, `src/integrations/google-maps/loader.ts`.
- Data contracts: `core_person`, `core_member`, `core_phone`, and `core_address` are the persistence seams behind the shell; query-param handoff uses `eventSlug`, `formSlug`, and the `fromWizard=true` return flag.
- Permission and context contracts: authenticated route, current user/session context, and event-form handoff context are required; this shell does not own its own organisation or RBAC policy.
- **Implementation note (pace-portal):** `/profile-complete` is wrapped by the PR01 `ProtectedRoute` and `ProfileCompleteLayout` rather than `PagePermissionGuard`, because `rbac_check_permission_simplified` / `rbac_permissions_get` can block onboarding when `profile-complete` page rows are absent. Access remains authenticated-only; use `PagePermissionGuard` here only once RBAC page metadata guarantees non-blocking roles.
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

- **PR05** owns `/profile-complete` page chrome: guard, step progress, navigation between steps, save/continue orchestration, and redirects.
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
- `src/pages/auth/ProfileCompletionWizardPage.tsx`
- `src/hooks/auth/useProfileCompletionWizard.ts`
- `src/shared/lib/profileProgress.ts`
- `src/shared/hooks/useReferenceData.ts`
- `src/shared/lib/utils/userUtils.ts`
- `src/hooks/contacts/usePhoneNumbers.ts`
- `src/hooks/shared/useAddressData.ts`
- `src/integrations/google-maps/loader.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
