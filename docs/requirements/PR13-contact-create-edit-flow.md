# PR13 — Contact create edit flow

## Filename convention

This file is **`PR13-contact-create-edit-flow.md`** — portal requirement slice **PR13** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the additional-contact create/edit workflow so users can add, match, link, edit, and save contacts with the same core behavior as the current portal.
- Dependencies: this slice depends on the list shell in `PR12`; it owns the inline create/edit experience, matching, branching, and save behavior for contacts.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the page loads contacts through `data_pace_contacts_list` or `data_pace_member_contacts_list` depending on proxy mode; it shows a `ProxyModeBanner` when editing on behalf of another member; clicking add opens an inline contact form; the flow starts with email lookup, then branches to existing-person confirmation or a full manual form; the current flow also needs a viable manual path for contacts without an email address; editing an existing contact skips the email step and opens the full form prefilled; submit updates `core_person`, `core_contact`, and `pace_phone`, or uses the contact RPCs in proxy mode; list rendering is a separate concern; the current duplicate-contact detection is implemented against the signed-in user path, which means the proxy flow is not a trustworthy baseline for duplicate prevention.
- Rebuild delta: preserve the current route and inline editor as the rebuild baseline; preserve the branching flow unless a later evidence-backed UX pass intentionally simplifies it; preserve proxy-mode support as a first-class path; keep phone-number editing behavior; add duplicate-detection rules before create/link save so the same person is not linked twice; when an email match is already linked as a contact, block duplicate linking and direct the user back to edit the existing contact instead of creating an override path; in proxy mode, evaluate duplicate-contact rules against the target member being managed, not the signed-in delegate; prefer pace-core controls where they already exist.

## Acceptance criteria

- [ ] A user can add a new contact from the page and complete the flow through save.
- [ ] If a matching person is found by email, the user can choose to link or create a new contact.
- [ ] A user can still create a contact through a manual no-email branch when no email exists.
- [ ] An existing contact can be opened in edit mode and saved successfully.
- [ ] Proxy mode continues to fetch and mutate the target member's contacts.
- [ ] Validation errors are surfaced before save.
- [ ] Duplicate-contact detection blocks accidental double-linking without silently creating a second contact record.
- [ ] When an email match is already linked as a contact, the flow blocks duplicate linking and tells the user to edit the existing contact from the list.
- [ ] In proxy mode, duplicate-contact checks are evaluated against the target member's existing contacts rather than the signed-in delegate's contacts.
- [ ] The contact list refreshes after create, edit, or delete.
- [ ] The UI remains built from pace-core primitives where equivalents exist.

## API / Contract

- Public exports: the inline contact form, the email, match-confirmation, relationship, and full-form steps, `useContactFormState`, `useContactOperations`, `useLinkedProfiles`, and the contact validation utilities.
- File paths: `src/pages/contacts/AdditionalContactsPage.tsx`, `src/components/contacts/ContactForm.tsx`, `src/components/contacts/ContactForm/EmailFormStep.tsx`, `src/components/contacts/ContactForm/MatchConfirmationStep.tsx`, `src/components/contacts/ContactForm/RelationshipFormStep.tsx`, `src/components/contacts/ContactForm/FullFormStep.tsx`, `src/hooks/contacts/useAdditionalContactsData.ts`, `src/hooks/contacts/useContactFormState.ts`, `src/hooks/contacts/useContactOperations.ts`, `src/hooks/contacts/useLinkedProfiles.ts`, `src/utils/contacts/validation.ts`.
- Data contracts: `data_pace_contacts_list`, `data_pace_member_contacts_list`, `app_pace_contact_create`, `app_pace_contact_update`, `app_pace_contact_delete`, `core_person`, `core_contact`, `core_contact_type`, `core_phone_type`, `core_phone`, and `pace_phone`.
- ID contract: contact create, link, and edit boundaries should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where acting user, target member, organisation, and guarded-page identifiers cross hook or service seams.
- Form contract: the branching contact create and edit forms should use `useZodForm` from `@solvera/pace-core/hooks` for Zod-backed validation and state instead of wiring raw `react-hook-form` per step.
- Permission and context contracts: authenticated user context is required; `PagePermissionGuard` continues to protect page access; proxy mode is supported for editing another member's contacts; save paths must respect whether the flow is acting on the signed-in member or a proxy target.

Duplicate-link decision table:

| Mode | Match result | Already linked to active contact set | Expected outcome |
| --- | --- | --- | --- |
| Self-service | No matching person by email | No | Allow normal create flow |
| Self-service | Matching person by email | No | Allow link flow or manual create-new path |
| Self-service | Matching person by email | Yes | Block duplicate linking and direct the user to edit the existing contact |
| Proxy mode | No matching person by email | No target-member match | Allow normal create flow for the target member |
| Proxy mode | Matching person by email | No target-member match | Allow link flow or manual create-new path for the target member |
| Proxy mode | Matching person by email | Yes, linked to the target member already | Block duplicate linking and direct the user to edit the existing target-member contact |

## Visual specification

- Component layout and composition: `/additional-contacts`, the proxy-mode banner, the inline contact form, the contact list, the empty state, edit/delete actions, and the loading, validation-error, and save-failure states.
- States: email lookup, match confirmation, full-form and no-email manual entry, duplicate-contact blocking, validation, save, and proxy-mode states must remain explicit. The blocked duplicate state may remain simple, but it must direct the user toward editing the existing contact rather than attempting an override.
- Authoritative visual recipe: preserve the current inline editor and branching flow; keep the email-first matching experience, the existing-person confirmation step, the relationship step, the full form step, and the current phone-table editing pattern; use pace-core `Button`, `Card`, `Form`, `Select`, `Input`, `Alert`, `Checkbox`, `DataTable`, and `LoadingSpinner` where available.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify the add flow, match flow, manual no-email flow, edit flow, and proxy flow from `/additional-contacts`.
- Verify contact list refresh after create, edit, and delete.
- Verify duplicate-link prevention and validation feedback during the branching workflow.

## Testing requirements

- Cover happy-path create, edit, and proxy mutation flows, plus the no-email manual branch.
- Cover validation failures for missing required fields, matching paths, duplicate-link prevention, and partial or missing phone-data responses.
- Cover the case where an existing person is already linked as a contact and the flow must block linking, show a clear blocking message, and direct the user back to editing the existing contact.
- Cover proxy-mode duplicate prevention specifically against the target member's existing contacts so the delegate's own contact list cannot produce a false result.

## Slice boundaries

- **PR12** owns `/additional-contacts` list shell, empty state, delete, and the add-contact CTA. **PR13** owns `ContactForm`, branching (email match, manual path, edit), validation, and save. `AdditionalContactsPage.tsx` is a coordination surface: list behavior follows **PR12**; create/edit follows **PR13**.

## Do not

- Do not reduce the flow to email-only identity assumptions.
- Do not silently create duplicate person/contact links.
- Do not introduce an override path for already-linked contacts unless a later requirement explicitly adds one.
- Do not bury proxy-aware behavior inside untyped conditional branches.
- Do not change the inline editor into a modal or separate route without an evidence-backed requirement.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/contacts/AdditionalContactsPage.tsx`
- `src/components/contacts/ContactForm.tsx`
- `src/components/contacts/ContactForm/EmailFormStep.tsx`
- `src/components/contacts/ContactForm/MatchConfirmationStep.tsx`
- `src/components/contacts/ContactForm/RelationshipFormStep.tsx`
- `src/components/contacts/ContactForm/FullFormStep.tsx`
- `src/hooks/contacts/useAdditionalContactsData.ts`
- `src/hooks/contacts/useContactFormState.ts`
- `src/hooks/contacts/useContactOperations.ts`
- `src/hooks/contacts/useLinkedProfiles.ts`
- `src/components/contacts/AdditionalContacts/AdditionalContactsList.tsx`
- `src/components/contacts/AdditionalContacts/AdditionalContactsDisplay.tsx`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- List shell: [PR12-contacts-listing.md](./PR12-contacts-listing.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
