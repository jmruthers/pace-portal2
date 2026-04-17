# PR07 — Member Profile Persistence DB Handoff (pace-core2)

## Purpose

This handoff is for the pace-core2 team if member-profile saves are still not persisting after the app-side fix that now:

- Rejects zero-row `UPDATE` responses as failures (instead of treating them as success),
- Falls back from direct `core_person` / `core_member` updates to RPCs:
  - `app_pace_person_update`
  - `app_pace_member_update`

App paths involved:

- `src/hooks/member-profile/usePersonOperations.ts`
- `src/hooks/member-profile/useAddressOperations.ts`
- `src/pages/member-profile/MemberProfilePage.tsx`

## Debug instrumentation now available in portal

The portal now emits structured client logs for member-profile save steps:

- `[member-profile][page] ...`
- `[member-profile][address] ...`
- `[member-profile][person] ...`

Enable explicitly (outside local dev defaults) with:

- `VITE_PROFILE_DEBUG_LOGS=true`

These logs include operation stage, key IDs, and error/code details (no auth tokens).

## Observed symptom

Member-profile save flow can complete UI-side but data does not persist in DB. The most likely cause is write path blocked by RLS/policy constraints (or writes targeting rows not visible in the effective policy scope), where direct updates can return zero rows without explicit SQL errors.

## Expected write surface for PR07

The save flow writes these tables:

1. `core_address` (upsert residential/postal)
2. `core_person` (identity + address IDs)
3. `core_member` (membership fields)
4. `core_phone` (soft-delete removed, update existing, insert new)

Fallback RPCs for constrained direct-write contexts:

- `app_pace_person_update`
- `app_pace_member_update`

## Required checks (pace-core2)

### 1) Confirm execute grants and behavior for fallback RPCs

Validate that authenticated portal users can execute:

- `app_pace_person_update(p_person_id, ...)`
- `app_pace_member_update(p_member_id, ...)`

And that each function returns at least one row for authorized self-service writes.

### 2) Validate RLS policies for direct table updates

Check `USING` and `WITH CHECK` policies for:

- `core_person`
- `core_member`
- `core_address`
- `core_phone`
- `core_member` **INSERT** (required when a person has no existing member row)

Expected behavior for self-service:

- User can update their own `core_person` row.
- User can update their own `core_member` row for selected organisation.
- User can update/insert addresses linked to their own profile.
- User can update/insert/soft-delete phone rows linked to their own profile.

### 3) Validate update path does not silently no-op

For an authenticated test user and known person/member IDs, verify update path returns changed rows (or explicit authorization errors), not zero-row success responses.

### 4) Verify trigger/function side-effects

If there are triggers enforcing attribution, organisation scoping, or immutable columns, ensure they do not discard writes without raising an error.

## Recommended DB-side action if checks fail

1. Align RLS policies so direct updates for self-service member profile writes are authorized.
2. Ensure RPCs are `SECURITY DEFINER` (if intended) with strict ownership checks, and return updated rows consistently.
3. Add a self-service `INSERT` path for `core_member`:
   - either an `INSERT` RLS policy for authenticated self-service users, or
   - a dedicated create RPC (for example `app_pace_member_create`) that enforces ownership/organisation checks.
4. Add regression tests in pace-core2 for:
   - direct update success (`core_person`, `core_member`, `core_address`, `core_phone`)
   - fallback RPC success
   - unauthorized write blocked with explicit error

## Suggested verification SQL (pace-core2 environment)

Run in controlled test environment with an authenticated user/session context:

1. Resolve current user/person/member mapping.
2. Execute direct update against `core_person` and `core_member`.
3. Execute `app_pace_person_update` and `app_pace_member_update`.
4. Confirm row-level changes persisted.

The exact SQL harness should follow pace-core2 auth simulation conventions for RLS tests.

## Acceptance criteria for closure

- Member-profile save from portal persists all intended fields.
- No silent zero-row success on writes.
- Either direct table writes succeed under policy, or RPC fallback succeeds with correct ownership checks.
- Proxy and self-service contexts remain correctly separated.
