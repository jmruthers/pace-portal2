# PR11 — Action-plan files

## Filename convention

This file is **`PR11-action-plan-files.md`** — portal requirement slice **PR11** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the file lifecycle for medical-condition action plans so users can attach, view, replace, and clean up supporting documents.
- Dependencies: this slice depends on the condition record and linkage established by `PR10`; it remains coupled to condition save and delete flows, but it does not own condition CRUD.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: `useMedicalConditions` creates or reuses a `medi_action_plan` row when a condition is edited or saved; the condition form renders pace-core `FileUpload` and `FileDisplay` areas; the parent page looks up linked action-plan records before deleting a condition; `useFileReference(..., true)` deletes the storage object as part of cleanup; condition cards show an action-plan link using `/action-plan/:id`, although that destination is not otherwise modelled in the portal route list.
- Rebuild delta: make file lifecycle ownership explicit and self-contained; preserve the condition-to-action-plan linkage so existing records can still be displayed and cleaned up; replace the current `/action-plan/:id` route assumption with inline open-in-new-tab behavior plus download fallback instead of introducing a dedicated viewer route; make upload validation and replacement sequencing explicit so a failed replacement does not destroy the currently linked document; prefer pace-core file primitives where they fit the requirement.

## Acceptance criteria

- [ ] A condition can show an existing action-plan file.
- [ ] A user can upload or replace the action-plan file for a condition.
- [ ] Unsupported file types or oversize uploads are rejected before save.
- [ ] Opening an action-plan file opens the referenced file in a new tab from the inline medical-profile UI rather than navigating to a dedicated viewer route.
- [ ] If the browser cannot preview the action-plan file in a new tab, the user still gets a download fallback.
- [ ] Replacing a file leaves the existing linked document intact unless the new upload and reference update both succeed.
- [ ] Deleting a condition also cleans up the linked action-plan file reference.
- [ ] The file workflow remains compatible with proxy mode.
- [ ] The file slice does not own condition CRUD or summary fields.
- [ ] Pace-core file primitives are used where they fit.

## API / Contract

- Public exports: the condition-file upload and display contracts, `useActionPlans`, `useFileReference`, and the supporting condition-to-action-plan linkage used by the parent medical-profile page.
- File paths: `src/pages/medical-profile/MedicalProfilePage.tsx`, `src/components/medical-profile/MedicalConditionForm.tsx`, `src/hooks/medical-profile/useActionPlans.ts`, `src/hooks/medical-profile/useMedicalConditions.ts`, `src/hooks/medical-profile/useMedicalProfilePage.ts`, `src/shared/hooks/useProxyMode.ts`.
- Data contracts: `medi_action_plan`, `medi_condition`, `useFileReference`, `FileUpload`, `FileDisplay`, organisation-aware file reference deletion, and storage deletion as part of cleanup.
- ID contract: action-plan file boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where acting-user attribution, organisation-scoped file access, and guarded-page identifiers cross typed service boundaries.
- Permission and context contracts: authenticated member or proxy editor only; file access must respect the same organisation and proxy context as the parent medical profile; deletion must still respect current RLS and organisation constraints.
- **Upload validation (normative):** Reject client-side before persisting references: **max size 10 MB** per file; **allowed MIME types** `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. If the target Supabase bucket policy enforces different limits, the app must match the **stricter** of policy vs this spec and document any override in the consuming repo’s implementation notes.

### Implementation sequencing (normative)

- Ship this slice’s **rollback + cleanup helpers** before or in the same milestone as [PR10-medical-conditions-crud.md](./PR10-medical-conditions-crud.md) modal upload, so PR10 only consumes PR11 contracts for replace/delete.
- **Condition delete:** Expose a single testable helper path (e.g. from `useActionPlans` or coordinated `useMedicalConditions` delete) so “delete condition” always runs **file/reference/storage cleanup** in the order: validate permission → delete storage object if required by `useFileReference` contract → remove reference rows → remove `medi_action_plan` → remove `medi_condition` (exact RPC order follows target schema; document in implementation).

## Visual specification

- Component layout and composition: file upload control inside the condition-management experience, current-file display or download state, replacement flow, delete or cleanup state, and loading or empty states for conditions with no file yet.
- States: loading, empty, upload success, upload failure, replacement in progress, cleanup, and permission-denied states must remain explicit.
- Authoritative visual recipe: keep the inline file workflow and the current preparing/uploading fallback states; the current form already uses pace-core `FileUpload` and `FileDisplay`; preserve the single-file-per-condition model and replace the legacy route link with inline open/download behavior.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify an existing action-plan file renders for a condition.
- Verify upload, replacement, and cleanup behavior in the medical-condition flow.
- Verify opening a file uses inline open-in-new-tab behavior, with download fallback when preview is unavailable.
- Verify proxy-mode access follows the same organisation-aware file path as the parent medical-profile page.

## Testing requirements

- Cover attach, replace, delete, invalid file type, oversize upload, rollback on failed replacement, and recoverable storage or Supabase failure states.
- Cover the missing-record cases: no action-plan record yet, missing reference row, and a storage object that exists without a matching reference row.
- Cover the proxy-mode path where files are accessed through delegated context.

## Slice boundaries

- Cooperates with **PR10** for in-modal action-plan UI. **PR11** owns `medi_action_plan` persistence, `useFileReference` semantics, storage deletion, and replacement rollback. Condition delete flows that remove linked action plans are coordinated with **PR10**’s delete behavior so file/reference cleanup remains explicit and testable—**PR11** defines the cleanup contract; **PR10** triggers it from user delete actions.

## Do not

- Do not introduce a dedicated action-plan viewer route.
- Do not make this slice own condition CRUD or summary fields.
- Do not let a failed replacement delete or orphan the currently linked document.
- Do not hide storage cleanup behavior or organisation-aware deletion inside unrelated UI code.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/medical-profile/MedicalProfilePage.tsx`
- `src/components/medical-profile/MedicalConditionForm.tsx`
- `src/hooks/medical-profile/useActionPlans.ts`
- `src/hooks/medical-profile/useMedicalConditions.ts`
- `src/hooks/medical-profile/useMedicalProfilePage.ts`
- `src/shared/hooks/useProxyMode.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
