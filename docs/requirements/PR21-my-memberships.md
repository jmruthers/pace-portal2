# PR21 — My Memberships

## Filename convention

This file is **`PR21-my-memberships.md`** — portal requirement slice **PR21** (see [portal-project-brief.md](./portal-project-brief.md)).

---

## Overview

- **Purpose and scope:** define the `/my-memberships` route as the member's primary surface for viewing organisation membership state and submitting new join or transfer requests. This slice covers the membership list and state display, the join/transfer flow (org search → membership type → org signup form → submission → confirmation), and the empty state. It is both the destination after wizard Step 5 completion (or skip) and a standalone portal section accessible at any time.
- **Dependencies:** PR01 app shell and PR02 shared services; PR05/PR06 (wizard routes to this page after onboarding); TM01 member request architecture for all RPC contracts, data model, and pre-submission check rules; PR15/PR17 form rendering contracts for the org signup form step (org-scoped rather than event-scoped); PR07 shared person data for the profile completeness pre-submission check.
- **Standards:** 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.

---

## Acceptance criteria

- [ ] `/my-memberships` renders for authenticated users behind `PagePermissionGuard`.
- [ ] The empty state renders when the member has no membership records, with an "Add Organisation" CTA.
- [ ] Each membership renders a state card reflecting the current `core_member.membership_status` and associated `team_member_request.status` per the display rules in **Visual specification**.
- [ ] The "Add Organisation" CTA launches the join/transfer flow inline on the same route.
- [ ] The join/transfer flow collects: request type (Join / Transfer), org search/select, membership type (if org has >1 active type with age eligibility filtering), and the org's `org_signup` form (or a minimal no-fields view if none is configured).
- [ ] Submitting the form calls `app_submit_member_request` and shows a confirmation screen on success.
- [ ] Pre-submission check failures surface as inline errors without calling the RPC:
  - Profile below completeness threshold → direct user to complete their profile.
  - Duplicate pending/on-hold request for the same org → explain and block.
  - Membership type age ineligibility → block with explanation.
- [ ] Transfer requests require selecting a source org (the org the member is leaving); this is shown as a step only when request type is Transfer.
- [ ] The page reflects real-time state after submission: the new card appears in the list at `Awaiting approval` without requiring a page reload.
- [ ] Declined memberships show an "Apply again" CTA that re-enters the join flow for the same org.
- [ ] No payment or billing behaviour is introduced.

---

## API / Contract

- **Public exports:** `/my-memberships`, `MyMembershipsPage`, `useMembershipList`, `useMemberRequestFlow`.
- **File paths:** `src/pages/memberships/MyMembershipsPage.tsx`, `src/hooks/memberships/useMembershipList.ts`, `src/hooks/memberships/useMemberRequestFlow.ts`.
- **Data contracts:**
  - Read: `core_member` + `team_member_request` joined by `member_id` for the current user's memberships. Use `core_member.membership_status` and `team_member_request.status` together to derive display state (see **Visual specification**).
  - Org search: type-ahead backed by **`data_pace_joinable_organisations_search`** (participant-safe directory of active tenants; avoids broad client `SELECT` on `core_organisations` under scoped RLS). Display name/id from RPC results.
  - Membership types: `core_membership_type` filtered by `organisation_id` and age eligibility against `core_person.dob`.
  - Org signup form: `core_forms` where `workflow_type = 'org_signup'` and `organisation_id` matches selected org and `status = 'published'` (DB **`form_status`** enum: `draft` / `published` / `closed`). If no matching published row exists, render no supplemental fields.
  - Submit: `app_submit_member_request(p_org_id, p_membership_type_id, p_form_response_id, p_request_type, p_source_org_id)` — see TM01 §5.1 for full RPC contract.
- **ID contract:** use `UserId`, `OrganisationId`, `PageId` from `@solvera/pace-core/types` at hook and service boundaries.
- **Form contract:** the org signup form step uses `useZodForm` from `@solvera/pace-core/hooks` for field validation, consistent with PR15/PR17 form rendering patterns. The org signup form is org-scoped (`organisation_id` FK) rather than event-scoped; `WorkflowFormRenderer` (or the equivalent renderer from PR17) renders the dynamic field set.
- **Permission and context contracts:** authenticated route, `PagePermissionGuard` with `read:my-memberships`, current user/session context, and selected organisation context for the submission call.

---

## Visual specification

### Membership state cards

Each card represents one `core_member` record. The display state is derived from `core_member.membership_status` combined with `team_member_request.status`:

| Display state | Condition | Card content |
|---|---|---|
| **Awaiting approval** | `membership_status = Provisional` AND `request_status = pending` | Org name, submitted date, "Awaiting approval" label |
| **Under review** | `membership_status = Provisional` AND `request_status = on_hold` | Org name, "Under review" label |
| **Active** | `membership_status = Active` | Org name, member number, membership type, "Active" label |
| **Not approved** | `membership_status = Declined` | Org name, "Not approved" label, "Apply again" CTA |
| **Resigned / Revoked / Suspended / Lapsed** | Other terminal/suspended statuses | Org name, status label (human-readable); no Apply again CTA |

### Empty state

When the member has no `core_member` records: a centered empty-state panel with copy explaining they are not yet a member of any organisations, and a primary "Add Organisation" button.

### Join/transfer flow

The flow is presented as an inline step sequence within the `/my-memberships` page (not a separate route or full-page modal). The route URL does not change during the flow; the flow is driven by component state.

Steps:

1. **Request type** — Join (new member) or Transfer from another org. If Transfer, an additional "Source org" step follows org selection.
2. **Org search/select** — type-ahead querying **`data_pace_joinable_organisations_search`**. Selected org shown as a confirmation chip before proceeding.
3. **Source org** *(Transfer only)* — select the org the member is leaving from their active memberships.
4. **Membership type** *(shown only if org has >1 active type)* — radio or select, filtered by age eligibility. If only one type exists, skip this step silently.
5. **Org signup form** — renders the org's **published** `org_signup` form (`core_forms.status = 'published'`) via `WorkflowFormRenderer`. If no form is configured, shows a minimal review screen with a Submit button only.
6. **Confirmation** — "Your request has been submitted. [Org name] will be in touch." with a return-to-list action.

Pre-submission errors are shown inline before step 6 triggers the RPC.

### States

Loading (while fetching membership list), empty, list with one or more cards, flow in progress (each step), submitting (spinner on submit button), submission error (inline), confirmation screen.

---

## Verification

- Verify `/my-memberships` renders for an authenticated member with no memberships, showing the empty state and "Add Organisation" CTA.
- Verify each membership state card (Awaiting approval, Under review, Active, Not approved) renders correctly from the appropriate `core_member` / `team_member_request` data combination.
- Verify the join flow completes end-to-end: org search → membership type → form → submit → confirmation card appears in list.
- Verify a Transfer request surfaces the source org step and includes `p_source_org_id` in the RPC call.
- Verify pre-submission checks surface the correct inline error for each failure case (profile incomplete, duplicate request, age ineligibility) without calling the RPC.
- Verify a Declined membership card shows the "Apply again" CTA and that tapping it re-enters the join flow pre-populated with the same org.
- Verify the page is reachable from the wizard completion redirect (Step 5 submitted or skipped).

---

## Testing requirements

- **Required automated coverage:** membership list rendering by status, empty state, join flow step sequencing, transfer flow source-org step visibility, pre-submission guard failures (all three cases), RPC call shape on submit, confirmation state after success, "Apply again" re-entry.
- **Required scenarios:** member with no memberships, member with one active membership, member with a pending request, member with a declined membership, transfer request end-to-end, org with no `org_signup` form configured, org with multiple membership types (age eligible and ineligible), submit failure from RPC.

---

## Slice boundaries

- **PR21** owns `/my-memberships`, the membership state list, and the join/transfer flow shell.
- **TM01** owns all RPC contracts (`app_submit_member_request`, `app_resolve_member_request`), the `team_member_request` data model, and the `core_member` status enum. This slice consumes those contracts; it does not redefine them.
- **PR15/PR17** own the `WorkflowFormRenderer` used for the org signup form step. This slice uses it; it does not re-implement dynamic form rendering.
- **PR05/PR06** own the wizard that routes to this page after onboarding. The wizard's Step 5 (`OrgMemberRequestSection`) is the entry-point component for a first request; subsequent requests are managed here.
- **PR07** owns member profile data used by the profile completeness pre-submission check.

---

## Do not

- Do not re-implement dynamic form rendering — use `WorkflowFormRenderer` from PR17.
- Do not write directly to `core_member` — all membership creation goes via `app_submit_member_request`.
- Do not use legacy `membership_status` values (e.g. do not create `core_member` records with statuses other than `Provisional` from this surface).
- Do not expose `team_member_request.review_notes` to the member — these are internal admin notes only.
- Do not add billing, payment, or joining-fee behaviour (Phase 2 per TM01 §11).
- Do not implement multi-step approval chains (Phase 2 per TM01 §11).
- Do not change the route URL during the join/transfer flow steps — the flow is inline state, not separate routes.

---

## References

- [pace-core import policy](./portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Project brief: pace-portal](./portal-project-brief.md)
- [Portal architecture](./portal-architecture.md)
- Member request architecture and RPC contracts: [TM01-member-request-architecture.md](../../../docs/TM01-member-request-architecture.md)
- Wizard entry point: [PR05-profile-wizard-shell.md](./PR05-profile-wizard-shell.md) · [PR06-wizard-field-details.md](./PR06-wizard-field-details.md)
- Form rendering: [PR17-form-journey-shell.md](./PR17-form-journey-shell.md) · [PR15-authenticated-form-rendering.md](./PR15-authenticated-form-rendering.md)
- Member profile (profile completeness check): [PR07-member-profile-self-service.md](./PR07-member-profile-self-service.md)
- DB-412 membership status enum: [`DB-change-decisions-p4.md`](../../../docs/database/decisions/DB-change-decisions-p4.md)
- `src/pages/memberships/MyMembershipsPage.tsx`
- `src/hooks/memberships/useMembershipList.ts`
- `src/hooks/memberships/useMemberRequestFlow.ts`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [portal-project-brief.md](./portal-project-brief.md) · [portal-architecture.md](./portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
