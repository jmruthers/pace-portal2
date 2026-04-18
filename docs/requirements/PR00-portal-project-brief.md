# Project brief: pace-portal

## Filename convention

Portal foundation docs in this folder follow:

**`PR00-portal-{project-brief|architecture}.md`**

| Segment | Meaning |
|--------|---------|
| **`PR`** | Requirements program prefix for this rebuild documentation set. |
| **`00`** | Foundation slot (shared with architecture and numbered requirement slices). |
| **`portal`** | Product identifier. |
| **`project-brief`** | Fixed suffix for this document type. |

---

This document describes the **high-level goals and objectives for pace-portal**. It is the main reference for what the project is and what it aims to achieve. For workspace setup (install `@solvera/pace-core`, Cursor rules, ESLint, env), follow the repository’s setup guide and `npm run setup` where applicable.

---

## What is pace-portal?

pace-portal is the member-facing web app in the PACE ecosystem. Members and delegated contacts sign in, complete onboarding, maintain member and medical profile data, manage additional contacts, and participate in event application workflows.

The app consumes `@solvera/pace-core` for app layout, auth, RBAC, common UI primitives, and shared platform behavior. It uses the shared Supabase project for data, storage, and authentication, and must preserve compatibility with the existing shared schema and contracts.

**The app delivers:**

- **Dashboard and member landing** – Protected home surface summarizing member status, profile prompts, linked profiles, and current event opportunities.
- **Auth and onboarding** – Sign-in, self-service account-creation entry route (`/register` placeholder in the active wave), and the protected profile-completion wizard.
- **Member profile management** – Self-service editing of personal information, addresses, phone numbers, and membership-related fields.
- **Delegated access and proxy mode** – Linked-profile and proxy-aware routes for viewing or editing a member’s in-scope portal data on their behalf.
- **Medical profile** – Medical summary data, medical-condition CRUD, and action-plan file lifecycle management.
- **Additional contacts** – Listing, creation, matching, linking, editing, and deletion of additional contacts, including proxy-aware flows.
- **Events and forms** – Authenticated event participant workflows including event hub, dynamic form rendering, draft/resume behavior, and final application submission (member-facing side of BASE registration workflows per cross-app alignment in [PR00-portal-architecture.md](./PR00-portal-architecture.md)).
- **Cross-module participant workflows** – Additional member journeys driven by BASE configuration (application progress, activity booking, token approvals) are in scope for pace-portal as the single member-facing app and are specified in PR18–PR20. Organiser/operator UI stays in BASE.
- **MVP scope guardrails** – Event lead/EOI and org lead/EOI participant journeys are out of MVP in this wave.

The current rebuild wave **intentionally excludes** billing profile, payment gateway integration, stored payment methods, and public invoice payment. Placeholder deferred slices for a future payments wave are documented in [PR00-portal-architecture.md](./PR00-portal-architecture.md) (deferred payment placeholders).

### Initial scope and product decisions

- **Canonical requirements:** [PR00-portal-architecture.md](./PR00-portal-architecture.md) and [PR01](./PR01-app-shell-routing.md)–[PR20](./PR20-token-approval-host.md) define **what to build** (routes, flows, UI behavior, slice ownership). A reference implementation may exist elsewhere; where code and these PR docs disagree, **update the PR docs or the code deliberately**—do not treat undocumented code as overriding silent requirements.
- **Consuming repository standards:** Environment variables, CI, test layout, full Supabase schema/RPC specifications, and repo-wide engineering policy are **not** duplicated under [`docs/requirements/portal/`](./); they are defined by the **target repository** that implements this app. **Canonical portal execution specs** for this program live in this folder (`PR00`–`PR16`).
- **Information architecture:** Slight preference to preserve current IA and page set. Consolidation or splitting is allowed when it clearly improves UX or SOLID boundaries; record changes in the relevant PR slice doc.
- **Visual direction:** No external design system beyond the current portal and `@solvera/pace-core`. Capture composition in slice requirements; cite **Standard 07: Visual** (see [PR00-portal-architecture.md](./PR00-portal-architecture.md) standards note) where UI is involved.
- **Event selector and participant event hub (required redesign):** Event workflow state must be explicit as **Apply**, **Resume**, or **Manage/Open**; **Resume** when `base_application.status = 'draft'` routes on the same path as **Apply**; when status is non-`draft`, route to the participant event hub page (`/:eventSlug`) where members see key event details and links to event workflows/forms. The hub should support name, logo, dates, participant blurb, admin email, website (where available), and workflow/checklist links. Detailed contracts start in [PR14-event-selector-and-hub.md](./PR14-event-selector-and-hub.md) and [PR03-dashboard-composition.md](./PR03-dashboard-composition.md), with follow-up slices for hub/detail workflows.
- **pace-core imports:** Use verified entrypoints for `@solvera/pace-core` as summarized in [PR00-portal-architecture.md](./PR00-portal-architecture.md) (cross-cutting contracts). Prefer `useZodForm` from `@solvera/pace-core/hooks` for Zod-backed forms where slices require it.

---

## Goals and non-goals

**Goals:**

- Rebuild the active non-payment portal experience as clear, implementation-ready requirement slices without losing behavioral fidelity from the current app.
- Use `@solvera/pace-core` as the default source of layout, auth, RBAC, and common UI primitives; keep app-specific code only where no equivalent exists.
- Preserve protected route behavior, organisation context semantics, proxy-mode behavior, and shared-schema compatibility unless a PR slice explicitly changes them.
- Keep event workflow states explicit (**Apply** / **Resume** / **Manage**) per the briefing above.
- Keep deliverables small enough for focused implementation, review, testing, and validation.

**Non-goals:**

- Preserving legacy file shapes or page orchestration one-for-one when a cleaner bounded-context split achieves the same behavior.
- Expanding scope into deferred payment and billing surfaces during this active wave.
- Owning database migrations, RLS design, or central schema evolution in this repository (unless ownership is explicitly assigned elsewhere).
- Broad product redesign beyond the event-selector changes above and cleanup needed to align with pace-core standards.
- **Preview mode** for event forms is out of scope for the rebuild (see [PR15-authenticated-form-rendering.md](./PR15-authenticated-form-rendering.md)).
- Full self-service sign-up and post-sign-up bootstrap on `/register` are **not** in the active wave ([PR04-register-placeholder.md](./PR04-register-placeholder.md)).
- Org signup is expected to require dedicated workflow-side effects and is tracked as a follow-up requirement set (TEAM + portal); it is not finalized by PR01–PR20.

---

## Tech stack

- **Runtime:** Node (LTS); package manager: npm (unless the repo specifies otherwise).
- **Language:** TypeScript (strict).
- **UI:** React 19, React DOM 19. React Compiler may be used where aligned with the API and Tech Stack standard.
- **Build:** Vite 7.
- **Styling:** Tailwind CSS v4, CSS-first: `@import 'tailwindcss';`, `@theme` for design tokens; no Tailwind v3 `@tailwind` directives or `tailwind.config.js` unless strictly required. App-level CSS in `src/app.css`.
- **State and data:** TanStack Query.
- **Forms:** `react-hook-form`, `zod`; prefer `useZodForm` from `@solvera/pace-core/hooks` where slices specify it.
- **Routing:** `react-router-dom`.
- **Testing:** Vitest, React Testing Library, `user-event`; tests colocated with source; configure reasonable per-test timeouts (e.g. 10s) per project convention.
- **Backend / auth:** Supabase (auth, database, RPCs, storage, edge functions where present). This repo connects to an existing Supabase project; it does not own central migrations unless explicitly scoped.
- **Consuming app:** Depends on `@solvera/pace-core`. Use `npm run setup` to align Cursor rules and ESLint with pace-core where applicable.

---

## Repo structure

**Scope note:** Paths such as `src/…` and `supabase/functions/` describe the **consuming portal application repository** that implements these requirements. They are not assumed to exist inside the **pace-core2** monorepo unless that repo also hosts the portal app.

pace-portal is a **standalone consuming app** with application code at repo root:

- **`src/`** – Pages, components, hooks, services, utilities, types, Supabase helpers.
- **`public/`** – Static assets (favicon, fonts, logos).
- **`supabase/functions/`** – Repo-owned edge-function code where applicable.
- **`docs/`** – Project brief, architecture, and rebuild requirements.

**Rebuild documentation (canonical):**

- This file – product-level brief.
- [PR00-portal-architecture.md](./PR00-portal-architecture.md) – bounded-context architecture.
- [PR01](./PR01-app-shell-routing.md)–[PR20](./PR20-token-approval-host.md) – numbered requirement slices (execution contracts).
- [PR00-portal-pace-core-candidates.md](./PR00-portal-pace-core-candidates.md) – optional pace-core2 enhancements suggested by portal slices (non-normative).

---

## Shared service result shape

- Slices that define shared services or submission helpers requiring a typed success/error envelope must use **`ApiResult<T>`** from `@solvera/pace-core/types` with `ok` / `err` / `isOk` / `isErr` as specified in [PR02-shared-services-hooks.md](./PR02-shared-services-hooks.md) and [PR16-event-application-submission.md](./PR16-event-application-submission.md).

---

## Quality gates

- **Validate:** One command (e.g. `npm run validate` or the repo’s equivalent) should run typecheck, lint, build, tests, and pace-core audit in order where configured. Passing validation is the definition of “done” for a change set.
- **Standards:** Renumbered pace-core standards (01–09) are canonical. Cursor rules and ESLint from pace-core via `npm run setup` where applicable.
- **No silencing:** Fix underlying issues; do not disable audit or lint to get a green build.
- **Docs vs code:** Implementation follows PR slice specs; do not copy legacy code mechanically when a spec defines different behavior.

---

## Out of scope

- **Schema and migrations** – This repo does not create or alter Supabase schema, RLS policies, or database functions unless a future requirement explicitly assigns ownership.
- **Payment and billing (active wave)** – Billing profile, payment gateway, stored payment methods, public invoice payment, Mint payment integration, and payment edge functions are deferred.
- **Shell-only misread** – “Shell” in a narrow sense means bootstrap + RBAC + layout without the full feature set; the full feature set is defined in PR01–PR20.

---

## Implementation program constraints

- Implement **one approved slice at a time** following **dependency order** (see [PR00-portal-architecture.md](./PR00-portal-architecture.md), appendix: slice dependency and legacy ID mapping).
- **PR slice specs win** over older discovery phrasing. If code and spec disagree, update the spec or the code deliberately—do not silently drift.
- **Route ownership:** Each route entry surface should be owned by exactly one slice’s scope (see architecture doc). Shared hooks may be listed under multiple slices in References without duplicating route ownership.
- **Review loop:** A completed slice should record what changed, which acceptance criteria passed, tests added/updated, residual risks, and any follow-on requirements.

---

## Explicit exclusions for this wave

- Payment, billing, invoice routes and UI (including `SmartBillingCard` on dashboard and delegated workspace).
- Dynamic per-event or per-organisation palette theming (`applyPalette`, `getPaletteFromEvent`, etc.) unless a future PR explicitly adds it ([PR14](./PR14-event-selector-and-hub.md), [PR15](./PR15-authenticated-form-rendering.md)).
- Event workflow routes require authenticated member context by default; unauthenticated access uses sign-in handoff with return URL (see architecture cross-cutting route model).
- **Login history:** Record via `recordLogin` from `@solvera/pace-core/login-history` as specified in [PR02-shared-services-hooks.md](./PR02-shared-services-hooks.md).

---

## Requirements traceability

- **Canonical execution specs:** [PR01](./PR01-app-shell-routing.md) through [PR20](./PR20-token-approval-host.md).

---

## Related documents

- [PR00-portal-architecture.md](./PR00-portal-architecture.md) – Bounded contexts, dependencies, cross-cutting contracts, route model, deferred domains.
- [PR01-app-shell-routing.md](./PR01-app-shell-routing.md) – First implementation slice after reading the architecture doc.
