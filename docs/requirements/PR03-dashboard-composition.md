# PR03 — Dashboard composition

## Filename convention

This file is **`PR03-dashboard-composition.md`** — portal requirement slice **PR03** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the dashboard as the portal's composition surface for user summary, profile prompts, event selection, and linked profiles, while excluding billing surfaces from the active rebuild wave.
- Dependencies: this slice depends on the shell and shared services from PR01 and PR02, and it composes contracts from member profile, contacts, and events slices. **PR14** replaces the dashboard `EventList` interaction defined here; implement PR03 before PR14 so the selector slot exists to swap.
- Standards: 02 Architecture, 03 Security/RBAC, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: `src/pages/DashboardPage.tsx` calls `useEnhancedLanding`, refetches once on mount, clears `editProxyMode` from `localStorage`, shows `LoadingSpinner` while data loads, renders `ProfileSetupPrompt` when no person record exists, and otherwise wraps the dashboard content in `PagePermissionGuard` for `dashboard/read` with an `AccessDenied` fallback. The visible composition currently includes `ContactSummaryCard`, `ProfilePrompts`, `EventList`, `SmartBillingCard`, and `LinkedProfilesSection`. `ContactSummaryCard` includes the profile photo upload entry point and fallback avatar display through `ProfilePhotoUpload` and `PhotoUploadDialog`, using pace-core `FileDisplay` and `FileUpload` against `core_person` with `FileCategory.PROFILE_PHOTOS`, folder `profile_photos`, and image-only upload validation. `ProfilePrompts` renders three summary cards for member profile, medical profile, and additional contacts. `EventList` renders horizontal event cards with logos, badges, and action buttons, then expands a forms panel for the selected event. The source dashboard still contains `SmartBillingCard`, but that is deferred out of this rebuild wave.
- Rebuild delta: preserve the dashboard as a composition page rather than moving business logic into it, keep the current section order and user-facing structure where it still makes sense, keep profile photo display and upload within the contact summary portion, remove billing surfaces from the active rebuild output, and implement the current `EventList` card-and-panel interaction as a distinct event-selector composition slot so the later event slice can replace it with the resolved `Apply` / `Resume` / `Manage` modal flow.

## Acceptance criteria

- [ ] The dashboard renders the same non-payment composition surface as the current portal.
- [ ] Loading, empty, access-denied, and success states are still covered.
- [ ] The page keeps the page-level permission check for `dashboard/read`.
- [ ] The dashboard still refreshes landing data after mount.
- [ ] Profile photo display and upload remain available from the contact summary.
- [ ] Profile photo upload remains image-only, single-file, and constrained to JPG, PNG, or WebP files up to 5 MB.
- [ ] A successful profile photo upload refreshes the displayed avatar without requiring a full page reload.
- [ ] Billing surfaces are removed from the active rebuild output.
- [ ] The dashboard implements the current `EventList` card-and-panel interaction as a separate event-selector slot that can later be swapped for the resolved `Apply` / `Resume` / `Manage` management modal flow.

## API / Contract

- Public exports: the dashboard page, the shared landing or data-assembly hook contract, and child card composition contracts for prompts, contacts, linked profiles, events, and contact-summary profile photo upload.
- File paths: `src/pages/DashboardPage.tsx`, `src/shared/hooks/useEnhancedLanding.ts`, `src/components/contacts/ContactSummaryCard.tsx`, `src/components/member-profile/ProfilePhotoUpload.tsx`, `src/components/member-profile/PhotoUploadDialog.tsx`, `src/components/member-profile/PhotoGuidelines.tsx`, and supporting dashboard-facing components in `src/components/*`.
- Data contracts: `useEnhancedLanding` is the dashboard's source of truth for the current user profile and categorized events; the dashboard consumes composed data from profile, contacts, linked-profile, and event contracts rather than owning the underlying fetches or mutations; profile photo display and replacement run against `core_person` file references using pace-core `FileDisplay` and `FileUpload`, `FileCategory.PROFILE_PHOTOS`, folder `profile_photos`, optional organisation scoping when an active membership exists, accepted MIME types `image/jpeg,image/png,image/webp`, and a 5 MB maximum upload size.
- File-scope contract: profile photo display and replacement are authenticated dashboard interactions, so they should stay on pace-core `FileDisplay` and `FileUpload` or the authenticated `useFileDisplay` and `useFileUpload` helpers, not `usePublicFileDisplay` and not bespoke storage URL generation.
- Permission and context contracts: the dashboard remains a protected surface; the page guard must stay in place before the composed content renders; proxy mode should continue to clear when the user lands on their own dashboard; the dashboard remains inside the authenticated `PaceAppLayout` shell contract and must follow `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`.

## Visual specification

- Component layout and composition: contact summary card with avatar display and upload dialog, profile completion prompt cards, the current `EventList` event selector rail and forms panel, and linked profiles card cluster.
- States: loading, profile-missing empty state, access-denied, avatar fallback, upload dialog open/closed, upload success, upload failure, and success.
- Authoritative visual recipe: keep the current section order, keep profile photo upload in the contact summary area, preserve the circular avatar display with fallback initials or icon, preserve the dialog-based photo-update flow with the current guidelines panel, prefer `pace-core` primitives for cards, buttons, progress, alerts, `FileDisplay`, `FileUpload`, and loading states, implement the current `EventList` interaction pattern as the placeholder event surface, and keep that event selector as a separate composition slot instead of collapsing it into the rest of the dashboard cards.

## Verification

- Verify `/dashboard` and `/` render the expected protected landing experience.
- Verify prompts, linked-profile surfaces, and event entry points render consistent loading, empty, error, denied, and success states.
- Verify profile photo upload accepts a valid image, refreshes the avatar after success, and rejects unsupported formats or oversize files.
- Verify updated profile data is visible after returning from edit pages.

## Testing requirements

- Cover composition behavior, conditional rendering by member state, exclusion of billing surfaces, and event-card state rendering separately from underlying event submission implementation.
- Cover the page-level permission check, refetch on mount, and proxy-mode clearing on own-dashboard entry.
- Cover profile photo fallback display, successful upload refresh, invalid file type, and oversize file rejection.
- Cover the no-person setup prompt path and refreshed data after navigating back from profile editing.

## Do not

- Do not move downstream domain logic into the dashboard simply because it is visible there.
- Do not reintroduce deferred billing cards in the active rebuild wave.
- Do not treat proxy-mode or event-state rendering as incidental edge cases.
- Do not couple the dashboard to event submission internals.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- `src/pages/DashboardPage.tsx`
- `src/shared/hooks/useEnhancedLanding.ts`
- `src/components/contacts/ContactSummaryCard.tsx`
- `src/components/member-profile/ProfilePhotoUpload.tsx`
- `src/components/member-profile/PhotoUploadDialog.tsx`
- `src/components/member-profile/PhotoGuidelines.tsx`
- `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`
- `src/components/member-profile/ProfilePrompts.tsx`
- `src/components/events/EventList.tsx`
- `src/components/contacts/LinkedProfilesSection.tsx`
- `src/components/member-profile/ProfileSetupPrompt.tsx`
- `./PR00-portal-project-brief.md` (event selector decisions)
- `./PR00-portal-architecture.md` (domain seams and route model)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
