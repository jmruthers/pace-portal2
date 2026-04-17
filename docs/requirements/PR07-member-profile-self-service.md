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

### Implementation contract (pace-portal2)

- **File layout (canonical for this repo):**
  - Page: [`src/pages/member-profile/MemberProfilePage.tsx`](./src/pages/member-profile/MemberProfilePage.tsx)
  - Form: [`src/components/member-profile/MemberProfile/MemberProfileForm.tsx`](./src/components/member-profile/MemberProfile/MemberProfileForm.tsx)
  - Hooks: [`src/hooks/member-profile/useMemberProfileData.ts`](./src/hooks/member-profile/useMemberProfileData.ts), [`useMemberAdditionalFields.ts`](./src/hooks/member-profile/useMemberAdditionalFields.ts), [`usePersonOperations.ts`](./src/hooks/member-profile/usePersonOperations.ts), [`useAddressOperations.ts`](./src/hooks/member-profile/useAddressOperations.ts)
  - Validation: [`src/utils/member-profile/validation.ts`](./src/utils/member-profile/validation.ts)
  - Proxy banner: [`src/shared/components/ProxyModeBanner.tsx`](./src/shared/components/ProxyModeBanner.tsx)
  - Optional Google loader: [`src/integrations/google-maps/loadGoogleMapsWithPlaces.ts`](./src/integrations/google-maps/loadGoogleMapsWithPlaces.ts) (loads Maps JS when `VITE_GOOGLE_MAPS_API_KEY` is set; otherwise address UI uses manual entry only).
- **Save order (must match for RLS and FK consistency):**
  1. Upsert `core_address` rows for residential (and postal when present), resolving `place_id` / structured fields.
  2. Update `core_person` with personal fields and `residential_address_id` / `postal_address_id`.
  3. Update `core_member` with membership fields and normalized `membership_status`.
  4. Replace `core_phone` rows for the person (soft-delete removed rows, insert/update current set).
- **Persistence guardrails:** `usePersonOperations` and `useAddressOperations` must treat zero-row updates as save failures (not silent success). For `core_person` / `core_member`, if direct table updates affect zero rows, fall back to `app_pace_person_update` / `app_pace_member_update` and fail the save if the RPC path also returns no rows.
- **DB escalation reference:** If persistence still fails under production RLS, use [`PR07-member-profile-persistence-db-handoff.md`](./PR07-member-profile-persistence-db-handoff.md) to hand required checks and policy/function changes to pace-core2.
- **Progress calculation:** Uses [`src/shared/lib/profileProgress.ts`](./src/shared/lib/profileProgress.ts) with **person** fields (`gender_id`, `pronoun_id` on `core_person`) and **member** fields (`membership_type_id`, `membership_number` on `core_member`), plus tracked person name/contact fields — aligned with generated Supabase types.
- **Membership status:** Persist only valid `pace_membership_status` enum values; normalize unknown/empty input to the existing stored value when updating, or to `Provisional` when creating a new member row (if ever introduced in this flow).

### Automated test matrix (colocated)

| Area | Test file |
|------|-----------|
| Page load, proxy banner, save flow (integration) | `src/pages/member-profile/MemberProfilePage.test.tsx`, `src/pages/member-profile/MemberProfilePage.save.test.tsx` |
| Profile data loading + `mapLoadModelToFormValues` | `src/hooks/member-profile/useMemberProfileData.test.ts` |
| Person/member save + status normalization | `src/hooks/member-profile/usePersonOperations.test.ts`, `src/hooks/member-profile/usePersonOperations.hook.test.tsx` |
| Address + phone persistence | `src/hooks/member-profile/useAddressOperations.test.ts` |
| Zod schema | `src/utils/member-profile/validation.test.ts` |
| Progress helper | `src/shared/lib/profileProgress.test.ts` |
| Form composition (pace-core `Form`) | `src/components/member-profile/MemberProfile/MemberProfileForm.test.tsx` |
| Proxy banner states | `src/shared/components/ProxyModeBanner.test.tsx` |
| Address row mapping | `src/hooks/member-profile/addressMappers.test.ts` |
| Reference-data wrapper | `src/hooks/member-profile/useMemberAdditionalFields.test.tsx` |
| Google Maps loader (optional) | `src/integrations/google-maps/loadGoogleMapsWithPlaces.test.ts` |

**Coverage note:** PR03 profile photo upload surfaces (`ProfilePhotoUpload`, `PhotoUploadDialog`) are excluded from Vitest coverage in `vite.config.ts` until dedicated component tests are added; they are out of the PR07 self-service save contract.

## Acceptance criteria

- [x] The page loads and prefills the current user’s profile.
- [x] The form renders the current sectioned composition.
- [x] Completion progress matches the current shared calculation.
- [x] Saving updates person, member, phone, and address data correctly.
- [x] Validation errors are surfaced before save.
- [x] The page remains usable without a proxy session.
- [x] Membership status continues to be normalized and persisted by the save contract.

## API / Contract

- Public exports: `/member-profile`, `MemberProfilePage`, `MemberProfileForm`, `MemberProfileFormValues`, `MemberProfileFormPhone`, `MemberProfileReferenceData`, `useMemberProfileData`, `useMemberAdditionalFields`, `usePersonOperations`, `useAddressOperations`, `useReferenceData`, and the proxy-detection hook used for the banner.
- File paths: `src/pages/member-profile/MemberProfilePage.tsx`, `src/components/member-profile/MemberProfile/MemberProfileForm.tsx`, `src/hooks/member-profile/useMemberProfileData.ts`, `src/hooks/member-profile/useMemberAdditionalFields.ts`, `src/hooks/member-profile/usePersonOperations.ts`, `src/hooks/member-profile/useAddressOperations.ts`, `src/shared/lib/profileProgress.ts`, `src/utils/member-profile/validation.ts`, `src/shared/hooks/useProxyMode.ts`, `src/shared/components/ProxyModeBanner.tsx`, `src/integrations/google-maps/loadGoogleMapsWithPlaces.ts` (optional).
- Data contracts: `core_person`, `core_member`, `core_phone`, `core_address`, `memberProfileSchema`, and the shared profile-progress helpers that turn form values into the current completion indicator.
- ID contract: prefer `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` at public hook and service boundaries when adding or refactoring code; existing call sites may use plain `string` until a focused typed-ID pass.
- Form contract: the self-service profile form uses the pace-core **`Form`** component from `@solvera/pace-core/components` with the Zod `memberProfileSchema` (`schema={memberProfileSchema}`) and field composition via `FormField` / `useFormContext` — the supported Zod + RHF bridge for this app. Do not introduce a page-local `useForm` + ad hoc resolver when `Form` already supplies the pattern.
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

## Verification log (automated)

- Last validated with `npm run validate` in CI/local (lint, type-check, tests with coverage, audit).

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
