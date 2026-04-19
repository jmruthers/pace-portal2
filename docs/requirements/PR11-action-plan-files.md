# PR11 — Action-plan files

## Filename convention

This file is **`PR11-action-plan-files.md`** — portal requirement slice **PR11** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the file lifecycle for medical-condition action plans so users can attach, view, replace, and clean up supporting documents.
- Dependencies: this slice depends on the condition record and linkage established by `PR10`; it remains coupled to condition save and delete flows, but it does not own condition CRUD.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: files are uploaded to Supabase storage (`files` bucket) with `pace-core` `FileUpload`; successful uploads create `core_file_references` rows and then link directly to `medi_condition.action_plan_file_id`; existing attachments are displayed inline in the edit modal via `FileDisplay` open-in-new-tab behavior; card-level attachment links also open in a new tab; delete flow in `useMedicalConditions` unlinks `action_plan_file_id`, deletes the referenced file metadata/storage object, then deletes the condition.
- Rebuild delta: keep file lifecycle explicit around `medi_condition.action_plan_file_id` + `core_file_references` (no `medi_action_plan` table dependency); keep upload validation and link/update sequencing explicit so permission or row-count failures surface clearly; keep inline open/download behavior and avoid dedicated viewer routes.

## Acceptance criteria

- [x] A condition can show an existing action-plan file.
- [x] A user can upload or replace the action-plan file for a condition.
- [x] Unsupported file types or oversize uploads are rejected before save.
- [x] Opening an action-plan file opens the referenced file in a new tab from the inline medical-profile UI rather than navigating to a dedicated viewer route.
- [x] If the browser cannot preview the action-plan file in a new tab, the user still gets a download fallback.
- [x] Linking an uploaded file to a condition surfaces explicit errors when no condition row is updated.
- [x] Deleting a condition also cleans up the linked action-plan file reference.
- [x] The file workflow remains compatible with proxy mode.
- [x] The file slice does not own condition CRUD or summary fields.
- [x] Pace-core file primitives are used where they fit.

## API / Contract

- Public exports: `useActionPlans`, modal + card attachment display contracts, and delete/link orchestration inside `useMedicalConditions`.
- File paths: `src/components/medical-profile/MedicalConditionForm.tsx`, `src/components/medical-profile/MedicalConditionsSection.tsx`, `src/hooks/medical-profile/useActionPlans.ts`, `src/hooks/medical-profile/useMedicalConditions.ts`, `src/constants/fileUpload.ts`.
- Data contracts: `medi_condition.action_plan_file_id`, `core_file_references`, `FileUpload`, `FileDisplay`, organisation-aware storage policies, and attachment deletion via `deleteAttachment`.
- ID contract: action-plan file boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where acting-user attribution, organisation-scoped file access, and guarded-page identifiers cross typed service boundaries.
- Permission and context contracts: authenticated member or proxy editor only; file access must respect the same organisation and proxy context as the parent medical profile; deletion must still respect current RLS and organisation constraints.
- **Upload validation (normative):** Reject client-side before persisting references: **max size 10 MB** per file; **allowed MIME types** `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. If the target Supabase bucket policy enforces different limits, the app must match the **stricter** of policy vs this spec and document any override in the consuming repo’s implementation notes.

### Implementation sequencing (normative)

- Keep this slice in lockstep with [PR10-medical-conditions-crud.md](./PR10-medical-conditions-crud.md) so modal upload/link behavior and card/link display stay consistent.
- **Condition delete:** keep a single testable helper path in `useMedicalConditions` so delete runs explicit ordered cleanup: validate permission/row access → unlink `action_plan_file_id` → delete linked file metadata/storage object → delete `medi_condition`.

## Visual specification

- Component layout and composition: file upload control inside the condition-management experience, current-file display or download state, replacement flow, delete or cleanup state, and loading or empty states for conditions with no file yet.
- States: loading, empty, upload success, upload failure, replacement in progress, cleanup, and permission-denied states must remain explicit.
- Authoritative visual recipe: keep inline file workflow in the shared add/edit modal; use `FileUpload` for selection and `FileDisplay` for open-in-new-tab links; keep single-file-per-condition linkage via `action_plan_file_id`; show card-level attachment links when linked file references exist.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify an existing action-plan file renders for a condition.
- Verify upload, replacement, and cleanup behavior in the medical-condition flow.
- Verify opening a file uses inline open-in-new-tab behavior, with download fallback when preview is unavailable.
- Verify proxy-mode access follows the same organisation-aware file path as the parent medical-profile page.
- Verify link/update failures surface actionable errors (for example, permission/no-updated-row cases).

## Testing requirements

- Cover attach, replace, delete, invalid file type, oversize upload, and recoverable storage or Supabase failure states.
- Cover no-row-updated link failures and no-row-deleted delete failures so silent no-op behavior is prevented.
- Cover missing-reference cases: no linked file ID, missing reference row for linked ID, and stale storage path errors.
- Cover the proxy-mode path where files are accessed through delegated context.

## Slice boundaries

- Cooperates with **PR10** for in-modal action-plan UI. **PR11** owns file-link semantics (`action_plan_file_id`), reference/storage cleanup contracts, and open/link behavior expectations. **PR10** triggers these contracts from condition modal/card UX.

## Do not

- Do not introduce a dedicated action-plan viewer route.
- Do not make this slice own condition CRUD or summary fields.
- Do not allow attachment-link updates to fail silently.
- Do not hide storage cleanup behavior or organisation-aware deletion inside unrelated UI code.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/medical-profile/MedicalProfilePage.tsx`
- `src/components/medical-profile/MedicalConditionForm.tsx`
- `src/components/medical-profile/MedicalConditionsSection.tsx`
- `src/hooks/medical-profile/useActionPlans.ts`
- `src/hooks/medical-profile/useMedicalConditions.ts`
- `src/constants/fileUpload.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
