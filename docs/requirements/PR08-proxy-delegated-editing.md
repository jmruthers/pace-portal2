# PR08 — Proxy delegated editing

## Filename convention

This file is **`PR08-proxy-delegated-editing.md`** — portal requirement slice **PR08** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: define delegated access for linked profiles, including the `/profile/view/:memberId` read-only route, the `/profile/edit/:memberId` proxy workspace, the proxy-session state carrier, and the linked-profile navigation entry points.
- Dependencies: PR07 self-service profile editing, PR01 app shell, and the shared proxy/dashboard utilities; this slice consumes the existing `useProxyMode` and `useProxyDashboard` hooks, `useMemberProfileData`, and the linked-profile card navigation.
- Standards: 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: `LinkedProfileCard` routes view-access users to `/profile/view/:memberId` and edit-access users to `/profile/edit/:memberId`; `ProfileViewPage` combines RBAC with contact-based access and renders a read-only profile summary; `ProfileEditProxyPage` validates access, writes `editProxyMode` to localStorage, loads the target member’s dashboard-style data through the existing `useProxyDashboard` hook, shows the proxy banner, renders the delegated workspace composition, and currently includes the existing `SmartBillingCard` render alongside the other dashboard cards; `useProxyMode` validates the stored proxy state, resolves target member and person IDs, and clears invalid or self-targeting sessions.
- Rebuild delta: preserve the route set and navigation entry points, treat local proxy state as an untrusted transport rather than a permission source, keep the proxy banner and delegated context explicit, preserve or improve delegated audit attribution, keep the edit proxy page as the intended dashboard-like delegated workspace, and explicitly exclude billing/payment/invoice content from the rebuilt delegated workspace, including the current `SmartBillingCard` artifact.

## Acceptance criteria

- [ ] Linked profiles navigate to the correct view or edit route based on permission.
- [ ] Proxy sessions are validated before delegated editing proceeds.
- [ ] Invalid proxy state is cleared rather than persisted.
- [ ] The read-only page shows profile data and edit affordance only when permitted.
- [ ] The edit proxy page shows delegated context clearly.
- [ ] Local proxy state alone is insufficient to authorize a protected delegated read or write.
- [ ] Delegated flows expose enough acting-user and target-member context for downstream audit attribution.
- [ ] Delegated users can reach the **same in-scope portal capabilities for the target member** as self-service (see **Delegated module reach** below) once proxy context is **server-valid**; navigation may differ by route (e.g. `/profile/edit/:memberId` workspace vs `/member-profile`) but **data scope and feature set** must not be narrower than the target member’s rebuild scope, excluding billing/payment.
- [ ] Billing/payment/invoice UI, including the current `SmartBillingCard`, is excluded from the rebuilt delegated workspace.

## API / Contract

- Public exports: `ProfileViewPage`, `ProfileEditProxyPage`, `useProxyMode`, `useProxyDashboard`, `LinkedProfileCard`, and `ProxyModeBanner`.
- File paths: `src/pages/member-profile/ProfileViewPage.tsx`, `src/pages/member-profile/ProfileEditProxyPage.tsx`, `src/shared/hooks/useProxyMode.ts`, `src/shared/hooks/useProxyDashboard.ts`, `src/components/contacts/LinkedProfileCard.tsx`, `src/shared/components/ProxyModeBanner.tsx`, `src/hooks/contacts/useLinkedProfiles.ts`.
- Data contracts: `editProxyMode` localStorage payload, `data_pace_member_access_get`, `data_pace_member_profile_get`, `data_pace_member_contacts_list`, `core_person`, `core_member`, and `core_phone`.
- ID contract: proxy-session payloads, delegated member lookups, and permission boundaries in this slice should use `UserId`, `OrganisationId`, and `PageId` from `@solvera/pace-core/types` instead of treating delegated targets and page permissions as untyped strings.
- Permission and context contracts: authenticated only; access must be confirmed through both RBAC and contact/member permissions; owner access wins; edit access enables delegated editing; view access remains read-only; delegated profile access must follow the layered page-permission and resource-permission contract in `./PR00-portal-architecture.md#rbac-and-route-permission-model`; invalid or self-targeting proxy sessions must be cleared; downstream reads and writes must still revalidate server-side.

### Delegated module reach (normative matrix)

Use this table to resolve “same in-scope modules” without open-ended interpretation. **Excluded everywhere:** billing, payments, invoices (including legacy `SmartBillingCard`). **Proxy state alone never grants access**—each surface still revalidates per architecture.

| Concern | Member (self-service) | Delegated (validated for target `T`) | PR owner |
| --- | --- | --- | --- |
| Dashboard & prompts | `/`, `/dashboard` | Target-equivalent composition from `/profile/edit/:memberId` (delegated workspace) and linked-profile entry points; must not surface payment/billing cards | PR03, PR08 |
| Member profile | `/member-profile` | `/profile/view/:memberId` (read) and `/profile/edit/:memberId` (edit) per contact/RBAC; edits apply to `T` | PR07, PR08 |
| Medical summary & conditions | `/medical-profile` | Same bounded context with hooks resolving **target member** in proxy mode | PR09, PR10 |
| Action-plan files | Within medical / condition flows | Same as member for `T`; file lifecycle per PR11 | PR10, PR11 |
| Additional contacts | `/additional-contacts` | Same flows; duplicate detection vs **`T`** in proxy mode | PR12, PR13 |
| Event landing & selector | `/:eventSlug/:formSlug` (public branch), dashboard cards | Same event/form behavior; handoff and CTAs per PR14; authenticated form and submit attribute to **`T`** when proxy requires it | PR14–PR16 |

If a future slice adds a new protected route, extend this matrix in the same table format—do not rely on vague “parity with legacy” wording alone.

## Visual specification

- Component layout and composition: `/profile/view/:memberId` read-only profile page with optional Edit button, `/profile/edit/:memberId` delegated workspace page, linked profile cards on the dashboard, proxy banner with delegated member name and contact type, and access-denied or view-only fallback states.
- States: loading, invalid-profile, access-denied, no-access, read-only, edit-enabled, and cleared-proxy-session states.
- Authoritative visual recipe: keep the edit proxy page as the dashboard-like delegated workspace for in-scope portal capabilities. Preserve the proxy banner, delegated navigation affordances, contact summary, prompts, and event-entry surfaces, but remove the current `SmartBillingCard` from the rebuild target because billing/payment/invoice behavior is explicitly out of scope.
- Globals: cite pace-core Standard 07 for banner, card, and layout behavior rather than restating shared styling rules here.

## Verification

- Verify linked profiles open the correct read or edit route based on permission.
- Verify the read-only profile page shows an Edit button only for edit-capable access.
- Verify the proxy edit page writes proxy state, shows the banner, and loads the target member workspace.
- Verify invalid, stale, or self-targeting proxy state is cleared on load.
- Verify revoked delegated access is rejected even when stale local proxy state exists.

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
- `src/components/contacts/LinkedProfileCard.tsx`
- `src/shared/components/ProxyModeBanner.tsx`
- `src/hooks/contacts/useLinkedProfiles.ts`
- `src/components/payments/SmartBillingCard.tsx`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
