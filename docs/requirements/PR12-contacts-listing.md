# PR12 — Contacts listing

## Filename convention

This file is **`PR12-contacts-listing.md`** — portal requirement slice **PR12** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the `/additional-contacts` page shell, the list and empty states, delete behavior, and the add-contact handoff that leads into `PR13`.
- Dependencies: this slice depends on the contacts data and proxy-mode semantics already provided by the shared page shell; create/edit form ownership belongs to `PR13`.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the page is protected by `PagePermissionGuard` for `additional-contacts`; it loads contacts through RPCs that differ between self-service and proxy mode; the RPC results are grouped by `contact_id` because each row may represent one phone number; the page shows a `ProxyModeBanner` when editing on behalf of another member; the header includes an add-contact button and supporting copy; when adding or editing, the page hosts `ContactForm` on the same route while **PR13** owns add/edit form state and branching; the contact list shows cards with name, contact type, email, phones, and permission badges; delete calls either the direct table or the proxy RPC and then refetches the list.
- Rebuild delta: keep `/additional-contacts` as the member-facing list and management landing page; preserve the current card-based list; keep list, empty state, delete, and the add-contact CTA here; **PR13** owns `ContactForm` and create/edit/match flows (see [PR13-contact-create-edit-flow.md](./PR13-contact-create-edit-flow.md)).

## Acceptance criteria

- [x] The page loads and renders contacts in self-service mode.
- [x] The page loads and renders contacts in proxy mode.
- [x] The empty state is useful and includes an add-contact CTA.
- [x] Delete removes a contact and refreshes the list.
- [x] The page still surfaces phone numbers and permission badges.
- [x] The create/edit form is not owned by this slice.
- [x] The rebuild docs explicitly call out the split into `PR13`.
- [x] Pace-core components are used where they fit the requirement.

## API / Contract

- Public exports: the additional-contacts page shell, the list and empty-state contracts, the delete action, and the add-contact handoff into `PR13`.
- File paths: `src/pages/AdditionalContactsPage.tsx`, `src/components/contacts/AdditionalContacts/AdditionalContactsList.tsx`, `src/components/contacts/AdditionalContacts/AdditionalContactsDisplay.tsx`, `src/hooks/contacts/useAdditionalContactsData.ts`, `src/hooks/contacts/useContactOperations.ts`, `src/hooks/contacts/useContactFormState.ts`.
- Data contracts: `data_pace_member_contacts_list` (self-service and proxy member scopes), `app_pace_contact_delete`, `core_contact`, `core_person`, `core_phone`, and the grouping of flat RPC rows into card-level contact objects.
- ID contract: additional-contact list and delete boundaries should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where signed-in user, proxy target, organisation, and guarded-page identifiers are exchanged between hooks or services.
- Permission and context contracts: authenticated users only; the page-level permission guard remains in place; proxy mode must continue to load and delete the target member’s contacts; list content and delete behavior must respect the selected organisation and target-member context.

## Visual specification

- Component layout and composition: `/additional-contacts`, the loading state, the empty state, contact cards with phones and permission badges, the delete action, the add-contact CTA that hands off to `PR13`, and the proxy-mode banner.
- States: loading, empty, populated, delete-failure, proxy-loading, and permission-denied states must remain explicit.
- Authoritative visual recipe: keep the current card-based contact list; add-contact opens create/edit mode where **PR13** supplies `ContactForm`; the page already uses pace-core `Button`, `LoadingSpinner`, `Card`, `Badge`, and `PagePermissionGuard`.
- Globals: cite pace-core Standard 07 Part A and Part C rather than restating shared global rules.

## Verification

- Verify `/additional-contacts` renders the expected list and empty states in self-service mode.
- Verify the same page renders correctly in proxy mode and continues to refetch after delete.
- Verify the add-contact CTA hands off to the create/edit slice without changing the list contract.

## Testing requirements

- Cover list rendering, empty state, delete behavior, duplicate phone rows from the RPC, proxy loading, and deletion failure states.
- Cover the permission-guarded access path and the self-service versus proxy data-source split.
- Cover the add-contact handoff so the form remains out of this slice.

## Slice boundaries

- **PR12** owns `/additional-contacts` page shell, list data, empty state, delete, and the add-contact **CTA** that enters create/edit mode.
- **PR13** owns `ContactForm`, add/edit/match steps, and save/cancel. PR12 may render `ContactForm` as a child when PR13’s mode is active; PR12 does not implement form fields, validation, or match logic.

## Do not

- Do not own the create/edit form contract here (that is **PR13**).
- Do not reduce the contact list to an email-only representation.
- Do not silently change the current grouping contract for flat RPC rows.
- Do not hide proxy-aware behavior or delete semantics inside an undocumented helper.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/AdditionalContactsPage.tsx`
- `src/components/contacts/AdditionalContacts/AdditionalContactsList.tsx`
- `src/components/contacts/AdditionalContacts/AdditionalContactsDisplay.tsx`
- `src/components/contacts/ContactForm.tsx`
- `src/hooks/contacts/useAdditionalContactsData.ts`
- `src/hooks/contacts/useContactOperations.ts`
- `src/hooks/contacts/useContactFormState.ts`
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [Portal architecture](./PR00-portal-architecture.md)
- Legacy ID mapping: [PR00-portal-architecture.md](./PR00-portal-architecture.md#appendix-a-legacy-slice-id-mapping-por-to-pr)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
