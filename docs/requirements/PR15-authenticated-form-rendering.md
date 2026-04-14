# PR15 — Authenticated form rendering

## Filename convention

This file is **`PR15-authenticated-form-rendering.md`** — portal requirement slice **PR15** (see [PR00-portal-project-brief.md](./PR00-portal-project-brief.md)).

---


## Overview

- Purpose and scope: rebuild the authenticated event form experience so a signed-in user can see the current event and form header, edit prefilled values, satisfy profile confirmation requirements, and resume in-progress form work behind a clean implementation boundary.
- Dependencies: `pace-core` form, input, alert, loading, card, button, and file-display primitives; form metadata and field-data hooks; profile-completion utilities; proxy-mode context; draft-application support.
- Standards: 01 Project Structure, 02 Architecture, 03 Security/RBAC, 04 API/Tech Stack, 05 pace-core Compliance, 07 Visual, 08 Testing/Documentation.
- Current baseline behavior: the page gates access behind auth and profile completion, bypasses the profile gate in preview or proxy scenarios, loads the form by event and form slug, fetches event header data, renders profile confirmation sections, creates a draft application for event forms, and uses the shared `/:eventSlug/:formSlug` route to decide whether the user sees public landing behavior or authenticated form behavior.
- Rebuild delta: keep the authenticated page and renderer in the same slice but keep the wrapper thin, preserve the profile-completion gate and proxy bypass, make the public-versus-authenticated route transition explicit, drop preview-mode behavior from the rebuild scope, preserve dynamic field rendering and confirmation blocks, add a non-crashing fallback for unsupported field types, persist draft responses so the form can resume cleanly, and explicitly leave pace-core dynamic event or organisation palette theming out of this rebuild wave unless a later requirement adds it.

## Acceptance criteria

- [ ] The authenticated form page loads the correct event and form header for the resolved slugs.
- [ ] Public and authenticated behavior on the shared route is explicit rather than implicit.
- [ ] Existing values load into the form where a matching table/column exists.
- [ ] Required profile confirmation sections render when configured.
- [ ] Draft applications are created or reused for event forms.
- [ ] Draft responses are persisted and restored when the user resumes the form.
- [ ] Unsupported field types fail clearly without crashing the page.

## API / Contract

- Public exports: `src/pages/events/FormFillPage.tsx`, `src/components/events/FormRenderer.tsx`, `src/hooks/events/useFormBySlug.ts`, `src/hooks/events/useFormFieldData.ts`, `src/hooks/events/useDraftApplication.ts`, `src/hooks/auth/usePhoneNumbers.ts`, and the profile-confirmation display contracts used by the renderer.
- Public service contracts: slug-driven form lookup, event-header lookup, profile-completion gating, proxy-mode bypass, field prefill, draft creation/reuse, and draft-response persistence must stay typed and explicit.
- File paths under the app: `src/pages/events/FormFillPage.tsx`, `src/components/events/FormRenderer.tsx`, `src/hooks/events/useFormBySlug.ts`, `src/hooks/events/useFormFieldData.ts`, `src/hooks/events/useDraftApplication.ts`, `src/hooks/auth/usePhoneNumbers.ts`, `src/shared/hooks/useProxyMode.ts`.
- Data contracts: `core_forms`, `core_form_fields`, `core_form_responses`, `core_form_response_values`, `base_application`, `core_person`, `core_member`, `core_phone`, and the supporting profile-completion utilities and proxy-mode context.
- ID contract: authenticated form-loading and draft boundaries in this slice should use `UserId`, `OrganisationId`, `EventId`, `AppId`, and `PageId` from `@solvera/pace-core/types` where user, organisation, event, application, and guarded-page identifiers cross hooks or services.
- Theming contract: do not apply `applyPalette`, `getPaletteFromEvent`, `getPaletteFromOrganisation`, or `clearPalette` in this slice during the rebuild; authenticated event-form theming is explicitly out of scope for the current wave.
- Form contract: the authenticated dynamic form renderer should use `useZodForm` from `@solvera/pace-core/hooks` for schema-backed field validation and submit state instead of composing raw `react-hook-form` plumbing around generated fields.

### Dynamic schema, field registry, and confirmation blocks (normative)

- **Single form boundary:** `FormRenderer` uses **one** `useZodForm` instance per active form page (one event/form pair). The Zod schema is **composed at runtime** from `core_form_fields`: a small **field-type registry** (map from server `field_type` → Zod fragment + pace-core control) builds a `z.object({ ... })` shape. Optional fields use `.optional()` or defaults as defined by metadata.
- **Profile confirmation blocks:** Treat confirmations as **named fields or a nested `confirmations` object** in the same schema so required confirmations block submit with explicit validation messages; do not maintain a parallel untyped state that bypasses `useZodForm`.
- **Unsupported `field_type`:** Register a fallback branch that renders an `Alert` (and a read-only placeholder where useful), **omits** the field from required submit validation unless the product requires hard-stop, and **never** throws during render—matching the acceptance criterion for non-crashing fallback.
- **Submit vs draft:** Client validation via `useZodForm` covers user-editable fields; **final persistence and duplicate-safe submit** are owned by [PR16-event-application-submission.md](./PR16-event-application-submission.md). Draft autosave may persist raw field payloads even when full Zod refinement would fail, as long as PR16 blocks final submit until valid.
- Permission and context contracts: the page requires authenticated user context, must respect proxy mode when the user is completing the form for someone else, must keep organisation context present for form loads and saves, and authenticated `PaceAppLayout` usage in this slice must follow `./PR00-portal-architecture.md#paceapplayout-and-appswitcher`.

## Visual specification

- Component layout and composition: authenticated route wrapper, event and form header, form description card, profile confirmation card, dynamic field card, draft-resume state, and loading/auth/profile-gate/error states.
- States: loading, unauthenticated landing handoff, profile-gate, proxy-mode bypass, empty form, validation error, unsupported field type, and resume-from-draft.
- Authoritative visual recipe: use `Form`, `FormField`, `Input`, `Textarea`, `Checkbox`, `Select`, `Button`, `Card`, `Alert`, `LoadingSpinner`, and `FileDisplay` primitives; keep the page wrapper thin and keep confirmation blocks inside the renderer unless they become noisy enough to extract.
- Globals: follow `pace-core` Standard 07 Part A and Part C for shared visual behavior and avoid restating global layout rules here.

## Verification

- Verify the authenticated `/:eventSlug/:formSlug` route loads the correct event and form and renders the form header, description, and field set.
- Verify the shared route still routes unauthenticated users into the public landing experience and authenticated users into the form experience.
- Verify profile-completion gating, proxy bypass, and draft-resume behavior on the same route.

## Testing requirements

- Required automated coverage: unit tests for field rendering and schema generation, integration tests for auth/profile gating and route-state selection, and regression coverage for unsupported field types.
- Required scenarios: happy-path authenticated fill, proxy-mode fill, required confirmation failure, existing-data lookup failure, zero-field form, saved-draft resume, and loading/error fallback states.

## Slice boundaries

- **PR15** owns authenticated `/:eventSlug/:formSlug` behavior: `FormFillPage`, `FormRenderer`, field/prefill, draft restore, and profile gate (with proxy bypass). **PR14** owns the public landing on the same route, dashboard event cards, and sign-in handoff. **PR16** owns submit orchestration and `ApiResult` persistence; see [PR16-event-application-submission.md](./PR16-event-application-submission.md).

## Do not

- Do not carry preview-mode behavior forward into the rebuild scope.
- Do not merge wrapper responsibilities, field rendering, and form-state persistence into one opaque page blob.
- Do not bypass `pace-core` auth or protected-route patterns.
- Do not add dynamic event or organisation palette theming in this slice unless a later requirement explicitly brings it into scope.
- Do not drop the profile-completion gate or the proxy-mode bypass behavior.

## References

- [pace-core import policy](./PR00-portal-architecture.md#pace-core-import-policy-verified-entrypoints)
- [Project brief: pace-portal](./PR00-portal-project-brief.md)
- [pace-portal architecture](./PR00-portal-architecture.md)
- [PaceAppLayout constraint](./PR00-portal-architecture.md#paceapplayout-and-appswitcher)
- `src/pages/events/FormFillPage.tsx`
- `src/components/events/FormRenderer.tsx`
- `src/hooks/events/useFormBySlug.ts`
- `src/hooks/events/useFormFieldData.ts`
- `src/hooks/events/useDraftApplication.ts`
- `src/hooks/auth/usePhoneNumbers.ts`
- `src/components/medical-profile/MedicalProfile/MedicalProfileDisplay.tsx`
- `src/components/contacts/AdditionalContacts/AdditionalContactsDisplay.tsx`

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (in-app flows for pace-portal) as specified in **Testing requirements** and **Verification**. Run the project's quality gates (for example `npm run validate`, or `npm run lint`, `npm run type-check`, and `npm run test:run` as applicable) and fix issues until they pass.

---

**Checklist before running Cursor:** [PR00-portal-project-brief.md](./PR00-portal-project-brief.md) · [PR00-portal-architecture.md](./PR00-portal-architecture.md) · Cursor rules · ESLint config · this requirements doc.
