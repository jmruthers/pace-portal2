# PR07 — Member profile self-service

## Filename convention

This file is **`PR07-member-profile-self-service.md`** — portal requirement slice **PR07** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define the signed-in member’s own `/member-profile` route for viewing and editing personal, contact, and membership fields with the current progress and save behavior.
- Dependencies: PR01 app shell, PR02 shared services, and the shared profile-progress and address/phone utilities; this slice is the self-service counterpart to PR08 delegated editing.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: `MemberProfilePage` loads the current user’s profile through `useMemberProfileData`, fetches additional member fields through `useMemberAdditionalFields`, uses `usePersonOperations` and `useAddressOperations` for persistence, renders `MemberProfileForm` under `PagePermissionGuard`, shows `ProxyModeBanner` when proxy mode is active, calculates progress with the shared profile-progress utility, saves to `core_person`, `core_member`, `core_phone`, and `core_address`, and navigates back to `/` after success.
- Rebuild delta: preserve the current sectioned card layout and save order while keeping proxy-specific behavior out of this slice except for shared detection; retain the repeatable phone editor, the Google Places-backed address field with fallback, and the current membership-status normalization used by the save path.

## Acceptance criteria

- [ ] The page loads and prefills the current user’s profile.
- [ ] The form renders the current sectioned composition.
- [ ] Completion progress matches the current shared calculation.
- [ ] Saving updates person, member, phone, and address data correctly.
- [ ] Validation errors are surfaced before save.
- [ ] The page remains usable without a proxy session.
- [ ] Membership status continues to be normalized and persisted by the save contract.

## API / Contract

- Public exports: `/member-profile`, `MemberProfilePage`, `MemberProfileForm`, `MemberProfileFormValues`, `MemberProfileFormPhone`, `MemberProfileReferenceData`, `useMemberProfileData`, `useMemberAdditionalFields`, `usePersonOperations`, `useAddressOperations`, `useReferenceData`, and the proxy-detection hook used for the banner.
- File paths: `src/pages/member-profile/MemberProfilePage.tsx`, `src/components/member-profile/MemberProfile/MemberProfileForm.tsx`, `src/hooks/member-profile/useMemberProfileData.ts`, `src/hooks/member-profile/useMemberAdditionalFields.ts`, `src/hooks/member-profile/usePersonOperations.ts`, `src/hooks/member-profile/useAddressOperations.ts`, `src/shared/lib/profileProgress.ts`, `src/utils/member-profile/validation.ts`, `src/shared/hooks/useProxyMode.ts`.
- Data contracts: `core_person`, `core_member`, `core_phone`, `core_address`, `memberProfileSchema`, and the shared profile-progress helpers that turn form values into the current completion indicator.
- ID contract: typed boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` where user, organisation, and page-permission identifiers cross hook or service boundaries, rather than passing raw `string` IDs.
- Form contract: the self-service profile form should use `useZodForm` from `@solvera/pace-core/hooks` as the default Zod and React Hook Form bridge instead of a page-local `useForm` setup.
- Permission and context contracts: authenticated only, `PagePermissionGuard`, current user context, and selected organisation context for persistence; the page must remain usable even when proxy mode is not active.

## Visual specification

- Component layout and composition: page header, completion progress bar, personal information card, contact information card, membership information card, repeatable phone-row editor, save action, and proxy banner when relevant.
- States: loading, validation error, save in progress, save failure, empty existing profile, and missing Google Places fallback.
- Authoritative visual recipe: preserve the current sectioned card layout and the existing `AddressField`, `Input`, `Select`, `Textarea`, and `DataTable` composition.
- Globals: cite pace-core Standard 07 for shared field, card, and loading behavior rather than restating shared styling rules here.

## Verification

- Verify `/member-profile` loads and prefills existing profile data.
- Verify the page remains usable with and without proxy mode active.
- Verify the progress indicator matches the current form state.
- Verify save success returns the user to `/`.
- Verify address and phone validation errors are surfaced before save.

## Testing requirements

- Required automated coverage: profile loading, form prefill, save success and update flows, validation failures, progress calculation, and proxy/non-proxy save paths.
- Required scenarios: no existing profile data, no current organisation selected, existing address replacement by `place_id`, empty or partial phone rows, missing Google Places key, and status normalization during save.

## Do not

- Do not merge proxy-mode delegated editing back into this self-service slice.
- Do not bury address or phone persistence in page-local one-off logic when a shared helper exists.
- Do not widen this bounded context into contacts or medical management.
- Do not introduce billing, payment, or invoice content.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- Delegated editing: [PR08-proxy-delegated-editing.md](./PR08-proxy-delegated-editing.md)
- `src/pages/member-profile/MemberProfilePage.tsx`
- `src/components/member-profile/MemberProfile/MemberProfileForm.tsx`
- `src/hooks/member-profile/useMemberProfileData.ts`
- `src/hooks/member-profile/useMemberAdditionalFields.ts`
- `src/hooks/member-profile/usePersonOperations.ts`
- `src/hooks/member-profile/useAddressOperations.ts`
- `src/shared/hooks/useReferenceData.ts`
- `src/shared/lib/profileProgress.ts`
- `src/utils/member-profile/validation.ts`
- `src/shared/hooks/useProxyMode.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
