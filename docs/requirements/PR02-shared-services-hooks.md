# PR02 — Shared services hooks

## Filename convention

This file is **`PR02-shared-services-hooks.md`** — portal requirement slice **PR02** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the portal's shared service layer so the non-UI orchestration used by dashboard, onboarding, member profile, contacts, and event flows remains behaviorally consistent while being easier to consume from future slices.
- Dependencies: this slice feeds the dashboard, onboarding, member profile, contacts, and event pages that rely on shared Supabase access, proxy handling, and landing aggregation.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 06 Code Quality, 08 Testing/Documentation, 09 Operations.
- Current baseline behavior: `src/lib/supabase.ts` creates a base Supabase client from environment variables and documents that it is only safe for public or auth operations and RBAC bootstrap. `src/shared/hooks/useReferenceData.ts` fetches phone, membership, gender, and pronoun types in parallel, caches them forever in TanStack Query, and sanitises errors. `src/shared/lib/utils/userUtils.ts` fetches the current person/member pair, uses cache and in-flight promise dedupe, and falls back only to the documented reduced-field current-user query path when the secure organisation-aware lookup is unavailable. `src/shared/lib/utils/userDataCache.ts` keeps a 30-second module-level cache and shared in-flight promise for user data. `src/shared/lib/profileProgress.ts` computes member-profile progress from a fixed set of tracked fields. `src/shared/hooks/useProxyMode.ts` reads proxy state from `localStorage`, validates access with RPCs, resolves the target person ID, and clears invalid proxy state. `src/shared/hooks/useEnhancedLanding.ts` aggregates profile data, phone presence, medical profile, additional contacts, and event categories into the dashboard landing model. `src/shared/lib/utils/inputValidation.ts` provides slug, UUID, redirect, and error-message helpers used throughout the active flows.
- Rebuild delta: keep the same observable data contract for the current hooks and utilities, but split large orchestration into smaller helpers where that improves testability. Preserve caching semantics, proxy validation, the documented reduced-field fallback path, delegated-action attribution, and the enhanced landing aggregate model. Add login-history recording as a shared side effect of successful authentication via pace-core2 rather than page-local logic. Keep payment-related helpers out of the active wave.

## Acceptance criteria

- [x] **Domain data parity:** On successful paths, shared services expose the **same domain payloads** (entities, fields, and aggregate structure) as the current portal for each public hook or helper—so consumers receive equivalent `data` inside `ApiResult` success branches. **TypeScript signatures may change** (e.g. wrapping in `ApiResult<T>`); parity means **behavior and successful `data` content**, not byte-identical legacy return types.
- [x] **Loading and errors:** Loading, cache, and error **behavior** matches the current portal (TanStack Query states, dedupe, sanitised errors, documented fallback paths). Errors at shared boundaries are represented as `ApiResult` failures (`ok: false`) with safe messages, not thrown exceptions, unless a legacy helper is explicitly documented as pre-migration and listed for follow-up.
- [x] Reference data is fetched in parallel and cached long term.
- [x] User-data fetching keeps cache dedupe and the documented reduced-field fallback behavior without introducing new bypass paths.
- [x] Proxy mode still validates access and resolves the target person ID.
- [x] Shared services expose enough proxy metadata for downstream slices to attribute delegated writes safely.
- [x] Enhanced landing still returns user profile and categorized events in a single aggregate model; **categorized events are only those allowed by [PR14](./PR14-event-selector-and-hub.md#dashboard-event-list-visibility-normative) dashboard visibility** (not every `core_events` row in accessible orgs).
- [x] Input validation helpers continue to block unsafe slug or redirect values and sanitise errors.
- [x] Successful authentication records login history once per auth session through the shared pace-core2 helper rather than page-level ad hoc calls.
- [x] No payment helper or billing behavior is pulled into the active rebuild slice.

## API / Contract

- Public exports: the base Supabase client, shared reference-data hook, user-data fetch and cache helpers, profile-progress helpers, proxy-mode hook, enhanced landing hook, and validation utilities.
- File paths: `src/lib/supabase.ts`, `src/shared/hooks/useReferenceData.ts`, `src/shared/hooks/useEnhancedLanding.ts`, `src/shared/hooks/useProxyMode.ts`, `src/shared/lib/profileProgress.ts`, `src/shared/lib/utils/userUtils.ts`, `src/shared/lib/utils/userDataCache.ts`, and `src/shared/lib/utils/inputValidation.ts`.
- Data contracts: `core_phone_type`, `core_membership_type`, `core_gender_type`, `core_pronoun_type`, `core_person`, `core_member`, `core_phone`, `medi_profile`, `core_events`, `core_forms`, `base_application`, `core_form_context_types`, and the RPCs used by proxy mode and landing flows; TanStack Query caching semantics are part of the contract. Enhanced landing uses `core_forms` together with `core_events` to enforce PR14 dashboard event visibility.
- Result contract: **exported** shared service and orchestration functions that cross slice boundaries **must** return `ApiResult<T>` from `@solvera/pace-core/types` and use the pace-core2 helpers `ok`, `err`, `isOk`, and `isErr`. **Internal** private helpers may return raw values until refactored, but **new** exports must use `ApiResult<T>`—do not add new public APIs that return ad hoc `{ success, error }` shapes.
- Auth side-effect contract: successful sign-in should call `recordLogin` from `@solvera/pace-core/login-history` once per auth session, using the Supabase auth session id and the best available user, organisation, event, and app context available at the shared-service layer rather than scattering login-history calls across pages.
- Permission and context contracts: public operations must continue to use the base client only where safe; authenticated data access must continue to rely on secure or organisation-aware clients in consumers; proxy mode must continue to validate the viewer's access before exposing a target profile; organisation or RLS failure paths must only degrade through the documented reduced-field current-user fallback; proxy-mode state alone must never be sufficient authority for a protected read or write.

## Visual specification

Not applicable.

## Verification

- Consuming app flows: dashboard landing, onboarding, member profile, additional contacts, and event flows that depend on the shared hooks should continue to work without changing their own contracts.
- Manual steps: verify cache dedupe, proxy invalidation, dashboard aggregation, and safe fallback under organisation or RLS failure.

## Testing requirements

- Cover cache hit behavior, in-flight promise reuse, organisation-aware person lookup fallback, proxy-mode cleanup, proxy-state rejection without valid server-side access, reference-data parallel loading, enhanced landing aggregation, and invalid slug or redirect input rejection.
- Cover the documented reduced-field fallback path and ensure it does not expand into generic app-specific bypass logic.
- Cover the login-history side effect so a successful auth session records exactly once with the shared helper and does not regress into duplicate page-level calls.
- Cover `ApiResult<T>` success and failure branches explicitly so shared-service consumers handle `ok` and `error` cases consistently.

## Do not

- Do not introduce payment helpers or billing behavior.
- Do not trust local proxy state alone as authorization.
- Do not re-embed page orchestration into the shared layer.
- Do not scatter `recordLogin` calls across individual pages or feature hooks.
- Do not invent slice-local result-envelope patterns when `ApiResult<T>` already covers the shared contract.
- Do not add new bypass paths around secure or organisation-aware data access.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/lib/supabase.ts`
- `src/shared/hooks/useReferenceData.ts`
- `src/shared/hooks/useEnhancedLanding.ts`
- `src/shared/hooks/useProxyMode.ts`
- `src/shared/lib/profileProgress.ts`
- `src/shared/lib/utils/userUtils.ts`
- `src/shared/lib/utils/userDataCache.ts`
- `src/shared/lib/utils/inputValidation.ts`
- `./PR00-portal-project-brief.md`
- `./PR00-portal-architecture.md`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
