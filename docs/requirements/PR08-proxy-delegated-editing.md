# PR08 — Proxy delegated editing

## Filename convention

This file is **`PR08-proxy-delegated-editing.md`** — portal requirement slice **PR08** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define delegated access for linked profiles, including the `/profile/view/:memberId` read-only route, the `/profile/edit/:memberId` proxy workspace, the proxy-session state carrier, and the linked-profile navigation entry points.
- Dependencies: PR07 self-service profile editing, PR01 app shell, and the shared proxy/dashboard utilities; this slice uses `useProxyMode`, `useProxyDashboard`, `useLinkedProfiles`, and `useDelegatedProfileView` (read path). It does **not** load the self-service `useMemberProfileData` aggregate on delegated routes.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior (pace-portal2): [`LinkedProfilesSection`](../../src/components/contacts/LinkedProfilesSection.tsx) on the dashboard routes view-capable users to `/profile/view/:memberId` and edit-capable users to `/profile/edit/:memberId` when `member_id` is resolved. [`ProfileViewPage`](../../src/pages/member-profile/ProfileViewPage.tsx) uses RBAC, `check_user_pace_member_access_via_member_id`, and linked-profile rows for edit affordance. [`ProfileEditProxyPage`](../../src/pages/member-profile/ProfileEditProxyPage.tsx) sets the proxy target from the URL, validates via `useProxyMode`, loads dashboard-style data with `useProxyDashboard`, shows [`ProxyModeBanner`](../../src/shared/components/ProxyModeBanner.tsx), and composes contact summary, prompts, and events — **without** billing or `SmartBillingCard`. Proxy intent is stored under [`PROXY_TARGET_MEMBER_STORAGE_KEY`](../../src/constants.ts) (`pace-portal:proxyTargetMemberId`); `useProxyMode` validates with RPC + `core_member` resolution and clears invalid or self-targeting sessions.
- Rebuild delta: treat local proxy state as an untrusted transport, keep the proxy banner and delegated context explicit, preserve delegated audit attribution fields from `useProxyMode`, keep the edit route as a **dashboard-like** delegated workspace (not a second copy of the full PR07 form unless a future slice adds it), and exclude all billing/payment/invoice UI.

## Acceptance criteria

- [x] Linked profiles navigate to the correct view or edit route based on permission.
- [x] Proxy sessions are validated before delegated editing proceeds.
- [x] Invalid proxy state is cleared rather than persisted.
- [x] The read-only page shows profile data and edit affordance only when permitted.
- [x] The edit proxy page shows delegated context clearly.
- [x] Local proxy state alone is insufficient to authorize a protected delegated read or write.
- [x] Delegated flows expose enough acting-user and target-member context for downstream audit attribution (`proxyAttribution` / `useProxyMode`).
- [x] Delegated **dashboard-like** workspace on `/profile/edit/:memberId` matches the intended PR03/PR08 composition (contact summary, prompts, events) for target `T` once server-valid; full **field-for-field** PR07 `MemberProfileForm` parity on that route is **not** required for this slice (see **Delegated module reach**).
- [x] Billing/payment/invoice UI is excluded from the delegated workspace.

## API / Contract

- Public exports: `ProfileViewPage`, `ProfileEditProxyPage`, `useProxyMode`, `useProxyDashboard`, `LinkedProfilesSection`, `useLinkedProfiles`, `hasDelegatedEditPermission`, and `ProxyModeBanner`. (Legacy docs referred to “LinkedProfileCard”; the dashboard UI is `LinkedProfilesSection`.)
- File paths: `src/pages/member-profile/ProfileViewPage.tsx`, `src/pages/member-profile/ProfileEditProxyPage.tsx`, `src/shared/hooks/useProxyMode.ts`, `src/shared/hooks/useProxyDashboard.ts`, `src/shared/hooks/useLinkedProfiles.ts`, `src/components/contacts/LinkedProfilesSection.tsx`, `src/shared/lib/utils/delegatedProfilePermissions.ts`, `src/hooks/member-profile/useDelegatedProfileView.ts`, `src/shared/components/ProxyModeBanner.tsx`.
- Data contracts: `pace-portal:proxyTargetMemberId` localStorage payload; RPC `check_user_pace_member_access_via_member_id` for gated reads (`useDelegatedProfileView`) and proxy validation (`useProxyMode`); `data_pace_linked_profiles_list` for linked rows; `data_pace_member_contacts_list` inside `fetchDelegatedWorkspace`; tables `core_person`, `core_member`, `core_phone`, `core_events`, `medi_profile` as implemented in [`useProxyDashboard`](../../src/shared/hooks/useProxyDashboard.ts).
- ID contract: prefer `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` at public hook and route boundaries where new code is added; existing call sites may still use `string` until a focused refactor lands.
- Permission and context contracts: authenticated only; access must be confirmed through both RBAC and contact/member permissions; owner access wins; edit access enables delegated editing; view access remains read-only; delegated profile access must follow the layered page-permission and resource-permission contract in `./PR00-portal-architecture.md#rbac-and-route-permission-model`; invalid or self-targeting proxy sessions must be cleared; downstream reads and writes must still revalidate server-side.

### Delegated module reach (normative matrix)

Use this table to resolve “same in-scope modules” without open-ended interpretation. **Excluded everywhere:** billing, payments, invoices (including legacy `SmartBillingCard`). **Proxy state alone never grants access**—each surface still revalidates per architecture.

| Concern | Member (self-service) | Delegated (validated for target `T`) | PR owner |
| --- | --- | --- | --- |
| Dashboard & prompts | `/`, `/dashboard` | Target-equivalent composition from `/profile/edit/:memberId` (delegated workspace) and linked-profile entry points; must not surface payment/billing cards | PR03, PR08 |
| Member profile | `/member-profile` (full `MemberProfileForm`) | `/profile/view/:memberId` (read-only summary + optional edit entry); `/profile/edit/:memberId` (**dashboard-like** workspace: contact summary, prompts, events — not a full duplicate of the PR07 form in this slice) | PR07, PR08 |
| Medical summary & conditions | `/medical-profile` | Same bounded context with hooks resolving **target member** in proxy mode | PR09, PR10 |
| Action-plan files | Within medical / condition flows | Same as member for `T`; file lifecycle per PR11 | PR10, PR11 |
| Additional contacts | `/additional-contacts` | Same flows; duplicate detection vs **`T`** in proxy mode | PR12, PR13 |
| Event landing & selector | `/:eventSlug/:formSlug` (public branch), dashboard cards | Same event/form behavior; handoff and CTAs per PR14; authenticated form and submit attribute to **`T`** when proxy requires it | PR14–PR16 |

If a future slice adds a new protected route, extend this matrix in the same table format—do not rely on vague “parity with legacy” wording alone.

## Visual specification

- Component layout and composition: `/profile/view/:memberId` read-only profile page with optional Edit button, `/profile/edit/:memberId` delegated workspace page, linked profiles section on the dashboard, proxy banner with delegated target display name (from `core_person` when available) or member id fallback, and access-denied or view-only fallback states.
- States: loading, invalid-profile, access-denied, no-access, read-only, edit-enabled, and cleared-proxy-session states.
- Authoritative visual recipe: keep the edit proxy page as the dashboard-like delegated workspace for in-scope portal capabilities. Preserve the proxy banner, delegated navigation affordances, contact summary, prompts, and event-entry surfaces; do not add billing/payment/invoice UI.
- Globals: cite pace-core Standard 07 for banner, card, and layout behavior rather than restating shared styling rules here.

## Verification

- Verify linked profiles open the correct read or edit route based on permission.
- Verify the read-only profile page shows an Edit button only for edit-capable access.
- Verify the proxy edit page writes proxy state, shows the banner, and loads the target member workspace.
- Verify invalid, stale, or self-targeting proxy state is cleared on load.
- Verify revoked delegated access is rejected even when stale local proxy state exists.

## Verification log (automated)

- Last validated with `npm run validate` in CI/local as part of the pace-portal2 quality gate (lint, type-check, tests with coverage, audit).

## Testing requirements

- Required automated coverage: view-only and edit-capable navigation, proxy-session validation, localStorage cleanup, resource-level access checks, and banner rendering.
- Required scenarios: self-targeting proxy state, inaccessible target member, access RPC failure, stale localStorage, revoked delegated access, view-only denial, and successful delegated entry into the target member workspace.

## Do not

- Do not let localStorage become the authorization source for delegated access.
- Do not merge proxy behavior back into self-service editing.
- Do not silently bypass server-side revalidation for protected reads or writes.
- Do not carry the current `SmartBillingCard` or any other billing/payment/invoice UI into the rebuilt delegated workspace.
- Do not treat proxy mode as an incidental edge case.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Portal RBAC constraint](./PR00-portal-architecture.md#rbac-and-route-permission-model)
- Self-service profile: [PR07-member-profile-self-service.md](./PR07-member-profile-self-service.md)
- `src/pages/member-profile/ProfileViewPage.tsx`
- `src/pages/member-profile/ProfileEditProxyPage.tsx`
- `src/shared/hooks/useProxyMode.ts`
- `src/shared/hooks/useProxyDashboard.ts`
- `src/components/contacts/LinkedProfilesSection.tsx`
- `src/shared/hooks/useLinkedProfiles.ts`
- `src/shared/components/ProxyModeBanner.tsx`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.

---

## Implementation note (pace-portal)

- **Delegated workspace data:** `fetchDelegatedWorkspace` in `src/shared/hooks/useProxyDashboard.ts` loads the target member aggregate (same shape as enhanced landing) after proxy access is validated; `useProxyDashboard` runs only when org + validated proxy ids are present.
- **Linked-profile entry:** `src/shared/hooks/useLinkedProfiles.ts` enriches RPC rows with `member_id` when needed; `src/components/contacts/LinkedProfilesSection.tsx` navigates to `/profile/view/:memberId` and, when `hasDelegatedEditPermission` applies, to `/profile/edit/:memberId`.
