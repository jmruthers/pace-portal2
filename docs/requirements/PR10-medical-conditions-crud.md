# PR10 — Medical conditions CRUD

## Filename convention

This file is **`PR10-medical-conditions-crud.md`** — portal requirement slice **PR10** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the medical-condition create, update, list, and delete experience for the medical profile page.
- Dependencies: this slice depends on the medical-profile page shell in `PR09`; action-plan file lifecycle and storage cleanup are owned by `PR11`.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: conditions are fetched from `medi_condition` ordered newest first; each condition renders as a card with badges for medical alert, severity, type, and inactive state; the card shows diagnosis, treatment, medication, triggers, emergency protocol, and notes where present; edit and delete actions are available when editable; the form is opened inline through `renderConditionForm`; `openConditionDialog` loads an existing condition or prepares a blank form; `saveCondition` validates, writes to `medi_condition`, and refreshes the list; `deleteCondition` removes the condition and its linked action-plan records; the current condition-type control is a custom hierarchical searchable dropdown, not a pace-core primitive.
- Rebuild delta: preserve the current card-based summary, metadata, and searchable hierarchy, but move add and edit into a modal-based condition editor for the rebuild so the interaction aligns with `useFormDialog` and a cleaner shared shell pattern; keep the CRUD boundary explicit; keep the action-plan upload and existing-file display inside that same condition editor context rather than splitting it into a separate surface; if the modal proves too dense in implementation, fall back to inline editing rather than a two-stage modal flow.

## Acceptance criteria

- [x] Users can add a medical condition and see it appear in the list.
- [x] Users can edit a medical condition and persist changes.
- [x] Users can delete a medical condition and the list refreshes.
- [x] Condition cards preserve the current high-signal summary information.
- [x] Condition type selection remains usable and searchable.
- [x] The slice clearly excludes file upload and file cleanup ownership.
- [x] Add and edit use a modal-based condition editor unless implementation density forces the documented inline fallback.
- [x] Pace-core equivalents are used where available.

## API / Contract

- Public exports: the medical-condition list and dialog contracts, `useMedicalConditions`, `useMedicalReferenceData`, `ConditionTypeDropdown`, and the validation helpers used by the condition form.
- File paths: `src/pages/medical-profile/MedicalProfilePage.tsx`, `src/components/medical-profile/MedicalConditionForm.tsx`, `src/components/medical-profile/ConditionTypeDropdown.tsx`, `src/hooks/medical-profile/useMedicalConditions.ts`, `src/hooks/medical-profile/useMedicalReferenceData.ts`, `src/utils/medical-profile/validation.ts`.
- Data contracts: `medi_condition`, `medi_profile` as the parent profile ID, `medi_action_plan` only for linkage or metadata required by the file slice, the condition-type reference data, and the proxy-aware RPCs used by the parent page.
- ID contract: condition CRUD boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where acting user, organisation, and guarded-page identifiers are passed into condition services or permission checks.
- Form contract: the condition add and edit form should use `useZodForm` from `@solvera/pace-core/hooks` as the standard Zod-backed form binding rather than a custom `react-hook-form` setup.
- Dialog-state contract: the rebuild target uses `useFormDialog` from `@solvera/pace-core/hooks` for add and edit state, selected-condition payload, and open or close orchestration. If the modal becomes too dense during implementation, the fallback is a documented return to inline editing rather than splitting condition details and action-plan upload into separate dialogs or steps.
- Permission and context contracts: authenticated member or proxy editor only; editing is gated by the parent medical profile and organisation context; proxy mode must continue to work for delegated edits; delete must respect the current page-level permissions and target-member context.

## Visual specification

- Component layout and composition: condition list cards, add-condition CTA, edit and delete actions on each card, and a modal-based condition editor that contains the condition fields plus the action-plan upload or existing-file display in the same context.
- States: loading, empty, validation, save, permission-denied, and stale-selection states must remain explicit.
- Authoritative visual recipe: preserve the current card-style condition presentation, severity and alert indicators, and full condition field set; move editing into a modal using pace-core dialog patterns; keep the action-plan area in the same modal so it remains clearly attached to the condition being edited; preserve the current searchable hierarchical condition-type experience unless a pace-core replacement matches it exactly enough.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify the condition list, add flow, edit flow, and delete flow from `/medical-profile`.
- Verify the current condition summary still renders the expected badges and metadata.
- Verify the modal editor keeps the action-plan upload or existing-file display attached to the condition context rather than surfacing it separately.
- Verify proxy-mode edits and deletes continue to operate against the target member context.

## Testing requirements

- Cover create, update, delete, validation failure, permission failure, and Supabase failure scenarios.
- Cover duplicate or conflicting condition data, invalid or missing condition type, no existing medical profile, editing while another condition editor is already open, and the save-first path that enables action-plan upload.
- Cover proxy-mode save and delete paths via the same RPC-backed permissions used by the parent page.

## Slice boundaries

- **PR11** owns action-plan **file lifecycle** (storage, reference rows, replacement rollback, cleanup on delete). **PR10** owns the condition **modal/editor UX** and may keep action-plan attach/display **in the same modal** as the condition; call shared file primitives and coordinate persistence rules with **PR11** so failed replacements do not destroy or orphan documents covered by **PR11**.

### Implementation sequencing (normative)

1. **PR11 first or lockstep:** Land `useActionPlans` / `useFileReference` **rollback and cleanup contracts** from PR11 before shipping PR10’s modal upload path, so replacement and delete paths never diverge silently.
2. **Delete orchestration:** Condition delete (`deleteCondition` / `useMedicalConditions`) **must** call PR11-owned cleanup for linked `medi_action_plan` rows and storage objects—PR10 owns the UX and list refresh; **PR11** owns deletion semantics and test assertions for file/reference removal.
3. **Shared limits:** Action-plan **MIME and size limits** are defined in [PR11-action-plan-files.md](./PR11-action-plan-files.md); PR10’s modal must surface the same rejection messaging before save.

## Do not

- Do not own file upload, file cleanup, or storage deletion here.
- Do not silently change the condition-type selector to a lower-fidelity control.
- Do not split the condition editor and the action-plan area into separate modal steps or separate detached surfaces.
- Do not keep a page-local dialog-state abstraction when `useFormDialog` fits the rebuild target.
- Do not widen this bounded context into medical-profile summary fields or unrelated contact flows.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/medical-profile/MedicalProfilePage.tsx`
- `src/components/medical-profile/MedicalProfile/MedicalProfileForm.tsx`
- `src/components/medical-profile/MedicalConditionForm.tsx`
- `src/components/medical-profile/ConditionTypeDropdown.tsx`
- `src/hooks/medical-profile/useMedicalConditions.ts`
- `src/hooks/medical-profile/useMedicalReferenceData.ts`
- `src/hooks/medical-profile/useActionPlans.ts`
- `src/utils/medical-profile/validation.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
