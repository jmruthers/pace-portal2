# PR06 — Wizard field details

## Filename convention

This file is **`PR06-wizard-field-details.md`** — portal requirement slice **PR06** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define the field groups, address parsing, phone repetition, and save semantics that live inside `/profile-complete`.
- Dependencies: PR05 shell behavior; this slice consumes `MemberProfileForm`-shape values, `useReferenceData`, `usePhoneNumbers`, `useAddressData`, `AddressField`, and the Google Places loader.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: step 1 collects first name, last name, middle name, preferred name, email, date of birth, gender, and pronouns; step 2 collects residential address, postal address, and one or more phone numbers; step 3 collects membership number and membership type; the wizard uses `AddressField` when Google Places is available, falls back to plain input otherwise, and persists through `core_person`, `core_member`, `core_phone`, and `core_address`.
- Rebuild delta: keep the same IA and page set, but make the step content and save contract explicit, including the current save order, the AU/NZ address lookup restriction, the replacement semantics for phone rows, and the persisted `membership_status` value that is normalized in the hook even though it is not surfaced as a user-editable step field.
- Ownership boundary: PR06 owns the field-group implementations, step-content rendering, step-level validation details, address and phone interaction behavior, and the persistence mapping that lives inside the `/profile-complete` flow; PR05 owns the exported page shell, route guard integration, progress chrome, and redirect orchestration.

## Acceptance criteria

- [x] Each step renders the current field groups faithfully.
- [x] Step 1 validates the required personal fields.
- [x] Step 2 validates at least one phone number and a residential address.
- [x] Step 3 remains optional but persists correctly.
- [x] Existing data is loaded into the relevant fields before editing begins.
- [x] Address selection updates both the displayed address and the saved address record.
- [x] Phone rows can be added, edited, and removed.
- [x] The save contract preserves the current `membership_status` normalization behavior.

## API / Contract

- Public exports: `MemberProfileForm`-shape field values, `MemberProfileFormPhone`, `MemberProfileReferenceData`, the step field contract inside `/profile-complete`, and the wizard save/validation helpers behind `useProfileCompletionWizard`.
- File paths: `src/pages/auth/ProfileCompletionWizardPage.tsx`, `src/hooks/auth/useProfileCompletionWizard.ts`, `src/components/member-profile/MemberProfile/MemberProfileForm.tsx`, `src/hooks/contacts/usePhoneNumbers.ts`, `src/hooks/shared/useAddressData.ts`, `src/integrations/google-maps/loader.ts`.
- Data contracts: `core_person`, `core_member`, `core_phone`, `core_address`, `memberProfileSchema`, `AddressField`, and the reference-data option sets for phone, gender, pronoun, and membership type.
- Form contract: the wizard step bodies should bind Zod-backed field groups through `useZodForm` from `@solvera/pace-core/hooks` rather than composing raw `react-hook-form` setup locally.
- Permission and context contracts: authenticated user/session context, selected organisation context for persistence, and the existing event-handoff return path from the shell.
- Ownership rule: edits in this slice may touch shared wizard files only for step body rendering, field-group composition, field-level validation, save mapping, and step-content persistence behavior. Shell framing, progress navigation, route guard behavior, and redirect outcomes remain owned by PR05.

## Visual specification

- Component layout and composition: step 1 personal details, step 2 contact details, and step 3 membership details within the wizard body.
- States: inline validation messages, add/remove phone controls, address autocomplete or plain-input fallback, and empty-field defaults when no existing data is present.
- Authoritative visual recipe: preserve the step-by-step field grouping and the existing `AddressField`, `Input`, `Select`, `Textarea`, and repeatable phone-row composition.
- Globals: cite pace-core Standard 07 for shared field and layout behavior rather than restating shared styling rules here.

## Verification

- Verify step 1, step 2, and step 3 render the current field groups and preserve their values across navigation.
- Verify address autocomplete works when Google Places is available and falls back to plain input when it is not.
- Verify phone rows can be added, edited, removed, and persisted as a replacement set.
- Verify existing person, member, phone, and address data are loaded into the step content before editing begins.

## Testing requirements

- Required automated coverage: step-level validation, address parsing, phone-row add/remove/edit behavior, and persistence mapping from form values to Supabase writes.
- Required scenarios: missing Google Places API key, cleared address selection, no phone rows in the database, address record matched by `place_id`, partial existing data, and save behavior that preserves the existing member status normalization.

## Slice boundaries

- **PR06** owns step bodies, field validation, and save mapping for personal/contact/membership data inside `/profile-complete`.
- **PR05** owns shell, progress, and redirects. See [PR05-profile-wizard-shell.md](./PR05-profile-wizard-shell.md).

## Do not

- Do not move shell framing, redirect handling, or page-guard behavior into this slice.
- Do not introduce billing, payment, or invoice content.
- Do not widen the step contract beyond the current personal/contact/membership groups without a separate requirement.
- Do not replace the current AU/NZ address lookup restriction when autocomplete is used.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- Wizard shell: [PR05-profile-wizard-shell.md](./PR05-profile-wizard-shell.md)
- `src/pages/auth/ProfileCompletionWizardPage.tsx`
- `src/hooks/auth/useProfileCompletionWizard.ts`
- `src/components/member-profile/MemberProfile/MemberProfileForm.tsx`
- `src/shared/hooks/useReferenceData.ts`
- `src/hooks/contacts/usePhoneNumbers.ts`
- `src/hooks/shared/useAddressData.ts`
- `src/integrations/google-maps/loader.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
