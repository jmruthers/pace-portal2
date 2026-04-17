# PR09 — Medical profile summary

## Filename convention

This file is **`PR09-medical-profile-summary.md`** — portal requirement slice **PR09** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild `/medical-profile` as the member-facing medical profile summary and save surface, with proxy-mode support, readiness gating, and completion progress.
- Dependencies: this slice depends on the member profile readiness gate already being satisfied; condition management belongs in `PR10` and action-plan file handling belongs in `PR11`.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior (pace-portal2): the page is guarded by `PagePermissionGuard`; it shows spinners while access, member-profile gate, proxy validation, or medical data loads; it redirects to `/member-profile` when the acting member profile is incomplete (with query params and an explanatory alert on the member profile page); it shows `ProxyModeBanner` and delegated copy in proxy mode; save is available from both the top and bottom action buttons; completion progress is derived from a minimal subset of `medi_profile` summary fields; **condition CRUD and action-plan file lifecycle are explicitly out of scope here** (read-only condition list + handoff copy only; see **Slice boundaries** below).
- Rebuild delta: keep the summary and save experience on `/medical-profile`; preserve the current grouped page information architecture unless a smaller split clearly improves implementation quality; split condition management and action-plan files into `PR10` and `PR11`; prefer pace-core grouped-summary or disclosure equivalents if they preserve the current behavior cleanly.

### Slice boundaries (PR10 / PR11)

- **PR09 (this slice):** `medi_profile` summary load/save via `data_medi_profile_get` / `app_medi_profile_update` (and insert when no row exists), progress over summary fields, read-only `medi_condition` list for display/handoff messaging only.
- **PR10:** condition CRUD and condition editor UX (not implemented here).
- **PR11:** action-plan file lifecycle (not implemented here; handoff text only on this page).

## Acceptance criteria

- [x] The page preserves the existing `/medical-profile` route and permission gate.
- [x] The page blocks access when the member profile is incomplete and explains the next step.
- [x] The page supports both self-service and proxy-mode editing.
- [x] The save flow persists medical profile data and surfaces success or validation feedback.
- [x] The completion progress indicator remains visible and derived from profile completeness.
- [x] The rebuild docs clearly state the split boundary into `PR10` and `PR11`.
- [x] Pace-core equivalents are used where available instead of introducing new custom controls.

## Implementation contract (pace-portal2)

- **Page:** [`src/pages/medical-profile/MedicalProfilePage.tsx`](../../src/pages/medical-profile/MedicalProfilePage.tsx) (re-exported from [`src/pages/MedicalProfilePage.tsx`](../../src/pages/MedicalProfilePage.tsx) for the lazy route).
- **UI:** [`src/components/medical-profile/MedicalProfile/MedicalProfileForm.tsx`](../../src/components/medical-profile/MedicalProfile/MedicalProfileForm.tsx), [`src/components/medical-profile/MedicalProfile/MedicalProfileDisplay.tsx`](../../src/components/medical-profile/MedicalProfile/MedicalProfileDisplay.tsx)
- **Hooks:** [`src/hooks/medical-profile/useMedicalProfilePage.ts`](../../src/hooks/medical-profile/useMedicalProfilePage.ts), [`src/hooks/medical-profile/useMedicalProfileData.ts`](../../src/hooks/medical-profile/useMedicalProfileData.ts), [`src/hooks/medical-profile/useMedicalReferenceData.ts`](../../src/hooks/medical-profile/useMedicalReferenceData.ts)
- **Validation / progress:** [`src/utils/medical-profile/validation.ts`](../../src/utils/medical-profile/validation.ts), [`src/shared/lib/medicalProfileProgress.ts`](../../src/shared/lib/medicalProfileProgress.ts)
- **Readiness redirect:** incomplete acting member profile → `/member-profile?completeMemberFirst=1&returnTo=/medical-profile` (handled in [`MemberProfilePage.tsx`](../../src/pages/member-profile/MemberProfilePage.tsx) via query string + alert).
- **Automated test matrix (colocated):** `MedicalProfilePage.test.tsx`, `useMedicalProfileData.test.ts`, `validation.test.ts`, `medicalProfileProgress.test.ts`; smoke updated in `PageSmoke.test.tsx`.

## API / Contract

- Public exports: `/medical-profile` page shell, summary form and display contracts, `useMedicalProfilePage`, `useMedicalProfileData`, `useMedicalReferenceData`, `useProxyMode`, and the member-profile readiness gate used by the page.
- File paths: `src/pages/medical-profile/MedicalProfilePage.tsx`, `src/components/medical-profile/MedicalProfile/MedicalProfileForm.tsx`, `src/components/medical-profile/MedicalProfile/MedicalProfileDisplay.tsx`, `src/hooks/medical-profile/useMedicalProfilePage.ts`, `src/hooks/medical-profile/useMedicalProfileData.ts`, `src/hooks/medical-profile/useMedicalReferenceData.ts`, `src/shared/hooks/useProxyMode.ts`.
- Data contracts: `medi_profile`, `core_person`, `core_member`, `data_medi_profile_get`, `app_medi_profile_update`, and the `useQueryClient().invalidateQueries(['enhanced-landing'])` refresh after save.
- ID contract: medical-profile read and write boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where member context, organisation context, and guarded-page identifiers are passed through hooks or services.
- Form contract: the medical-profile summary form uses the pace-core **`Form`** component with a Zod schema (same Zod + RHF bridge pattern as PR07 `MemberProfileForm`), not ad-hoc `react-hook-form` wiring in the page shell.
- Permission and context contracts: authenticated members only; `PagePermissionGuard` and `AccessDenied` remain in place; proxy mode must support editing a target member’s record using the existing organisation context; the page requires a completed member profile before editing is allowed; organisation context controls whether organisation-specific sections are shown.
- Downstream contract boundaries: this slice can read the conditions and action-plan identifiers needed to render summary handoffs, but it does not own the underlying CRUD or file lifecycle.

## Visual specification

- Component layout and composition: `/medical-profile` renders the spinner state, the missing-member-profile redirect state, an optional `ProxyModeBanner`, a summary header with top save action, a completion progress bar, the grouped medical-profile field sections, and a read-only condition summary or management handoff area.
- States: loading, missing member profile, proxy-target copy, validation, save, and permission-denied states must all be represented explicitly.
- Authoritative visual recipe: preserve the current grouped-section layout; the page already uses pace-core `Card`, `Button`, `Progress`, `LoadingSpinner`, and `ProxyModeBanner`; keep the two-save-button pattern and the current target-member copy in proxy mode.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify `/medical-profile` renders the expected summary view for both self-service and proxy-mode users.
- Verify the page redirects to `/member-profile` when the member profile is incomplete.
- Verify save behavior from both the top and bottom actions, including validation feedback and success feedback.
- Verify the progress bar updates as profile data changes and the read-only condition handoff remains visible.

## Testing requirements

- Cover page-level guard behavior, member-profile readiness gating, proxy-mode rendering, save validation, and successful persistence.
- Cover progress calculation and the downstream handoff boundary so condition CRUD and file ownership stay out of this slice.
- Cover loading, redirect, and recoverable error states for Supabase and RPC failures.

## Verification log (automated)

- Last validated with `npm run validate` (type-check, lint, build, tests with coverage, audit).

## Do not

- Do not reintroduce condition CRUD or action-plan file lifecycle into this slice.
- Do not hide condition CRUD or action-plan file lifecycle inside the medical-profile summary contract.
- Do not bypass `PagePermissionGuard`, `AccessDenied`, or the member-profile readiness gate.
- Do not re-embed page-local auth, loading, or save orchestration that belongs in shared hooks.
- Do not add undocumented public props, exports, routes, or service contracts.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/medical-profile/MedicalProfilePage.tsx`
- `src/components/medical-profile/MedicalProfile/MedicalProfileForm.tsx`
- `src/components/medical-profile/MedicalProfile/MedicalProfileDisplay.tsx`
- `src/hooks/medical-profile/useMedicalProfilePage.ts`
- `src/hooks/medical-profile/useMedicalProfileData.ts`
- `src/hooks/medical-profile/useMedicalReferenceData.ts`
- `src/shared/hooks/useProxyMode.ts`
- `src/shared/components/ProxyModeBanner.tsx`
- `src/utils/medical-profile/validation.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
