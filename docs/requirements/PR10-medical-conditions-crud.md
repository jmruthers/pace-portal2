# PR10 — Medical conditions CRUD

## Filename convention

This file is **`PR10-medical-conditions-crud.md`** — portal requirement slice **PR10** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the medical-condition create, update, list, and delete experience for the medical profile page.
- Dependencies: this slice depends on the medical-profile page shell in `PR09`; action-plan file lifecycle and storage cleanup are owned by `PR11`.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: conditions are fetched via `get_medi_conditions` and rendered as cards in a responsive grid (`md:grid-cols-2`, `xl:grid-cols-3`); cards show condition name, type path badge, severity badge, medical-alert badge, and an attachment indicator/link when present; add and edit both use the same `MedicalConditionForm` modal; delete is handled by `useMedicalConditions` and coordinates linked-file unlink + condition removal with strict affected-row checks so silent no-op updates/deletes surface as errors.
- Rebuild delta: keep cards intentionally high-signal and compact (no verbose per-field summary block on each card); preserve the shared add/edit modal surface; keep action-plan display/upload in the same modal context so users manage condition + file in one place.

## Acceptance criteria

- [x] Users can add a medical condition and see it appear in the list.
- [x] Users can edit a medical condition and persist changes.
- [x] Users can delete a medical condition and the list refreshes.
- [x] Condition cards are simplified to high-signal badges and actions (no long text summary block).
- [x] Condition type selection shows human-readable labels (not raw IDs), including existing inactive selections.
- [x] Add and edit use a single shared modal-based condition editor implementation.
- [x] File lifecycle semantics remain owned by PR11 while PR10 owns card + modal UX orchestration.
- [x] Pace-core equivalents are used where available.

## API / Contract

- Public exports: `MedicalConditionsSection`, `MedicalConditionForm`, `useMedicalConditions`, `useMediConditionTypes`, and condition validation helpers.
- File paths: `src/components/medical-profile/MedicalConditionsSection.tsx`, `src/components/medical-profile/MedicalConditionForm.tsx`, `src/hooks/medical-profile/useMedicalConditions.ts`, `src/hooks/medical-profile/useMediConditionTypes.ts`, `src/hooks/medical-profile/useMedicalProfileData.ts`, `src/utils/medical-profile/medicalConditionValidation.ts`.
- Data contracts: `medi_condition`, parent `medi_profile`, `get_medi_conditions`, `medi_condition_type`, and linked file-reference IDs (`action_plan_file_id`) consumed in-card and in-modal.
- ID contract: condition CRUD boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where acting user, organisation, and guarded-page identifiers are passed into condition services or permission checks.
- Form contract: add/edit form uses shared schema-driven validation via `medicalConditionFormSchema` in a single `MedicalConditionForm` implementation.
- Dialog-state contract: add/edit state is centralized in `MedicalConditionsSection` with one modal component instance (`MedicalConditionForm`) for consistency of behavior and layout.
- Permission and context contracts: authenticated member or proxy editor only; editing is gated by the parent medical profile and organisation context; proxy mode must continue to work for delegated edits; delete must respect the current page-level permissions and target-member context.

## Visual specification

- Component layout and composition: compact condition cards in a responsive grid; add-condition CTA; edit/delete actions per card; shared modal-based condition editor containing condition fields plus action-plan display/upload.
- States: loading, empty, validation, save, permission-denied, and stale-selection states must remain explicit.
- Authoritative visual recipe: cards show key identity/status signals (name + badges) and attachment affordance only; remove verbose field rows from cards; render attachment link as open-in-new-tab behavior; ensure badge rows wrap and card contents remain within bounds; keep add/edit on the same modal component path.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify the condition list, add flow, edit flow, and delete flow from `/medical-profile`.
- Verify cards render simplified content and wrap safely within card bounds in 1/2/3-column layouts.
- Verify condition type trigger renders selected label/path text (not numeric ID).
- Verify card-level attachment link opens file in a new tab when attachment exists.
- Verify the modal editor keeps the action-plan upload or existing-file display attached to the condition context rather than surfacing it separately.
- Verify proxy-mode edits and deletes continue to operate against the target member context.

## Testing requirements

- Cover create, update, delete, validation failure, permission failure, and Supabase failure scenarios.
- Cover condition-type label rendering for existing/inactive type IDs.
- Cover simplified card rendering + attachment-link presence behavior.
- Cover no-row-updated/no-row-deleted mutation outcomes so failures are surfaced rather than silently ignored.
- Cover invalid or missing condition type, no existing medical profile, editing while another condition editor is already open, and the save-first path that enables action-plan upload.
- Cover proxy-mode save and delete paths via the same RPC-backed permissions used by the parent page.

## Slice boundaries

- **PR11** owns action-plan **file lifecycle semantics** (storage/reference linkage and cleanup contracts). **PR10** owns the condition **cards + modal/editor UX** and keeps action-plan attach/display in the same modal context.

### Implementation sequencing (normative)

1. **PR11 first or lockstep:** Land `useActionPlans` cleanup contracts before shipping PR10 modal upload/link behavior.
2. **Delete orchestration:** Condition delete (`deleteCondition` / `useMedicalConditions`) must coordinate file-reference cleanup and condition delete with explicit row-count checks so policy mismatches cannot fail silently.
3. **Shared limits:** Action-plan **MIME and size limits** are defined in [PR11-action-plan-files.md](./PR11-action-plan-files.md); PR10’s modal must surface the same rejection messaging before save.

## Do not

- Do not own file upload, file cleanup, or storage deletion here.
- Do not show raw numeric condition-type IDs in the trigger when a label/path can be resolved.
- Do not split the condition editor and the action-plan area into separate modal steps or separate detached surfaces.
- Do not widen this bounded context into medical-profile summary fields or unrelated contact flows.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/medical-profile/MedicalProfilePage.tsx`
- `src/components/medical-profile/MedicalConditionsSection.tsx`
- `src/components/medical-profile/MedicalConditionForm.tsx`
- `src/hooks/medical-profile/useMedicalConditions.ts`
- `src/hooks/medical-profile/useMediConditionTypes.ts`
- `src/hooks/medical-profile/useActionPlans.ts`
- `src/utils/medical-profile/medicalConditionValidation.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
