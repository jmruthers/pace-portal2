# PR20 — Token approval host surfaces

## Overview

- Purpose and scope: host guardian/referee token approval pages in portal as thin standalone member-adjacent surfaces aligned to **[BASE BA07 — Token approval actions](../../../pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md)** contracts (backend/RPC semantics). **UI lives here only**—not in `@solvera/pace-core`.
- Dependencies: PR01, BASE BA07.
- Canonical route: `/approvals/:token` (public entry, minimal chrome, no app navigation).
- Implementation note (pace-portal): public route `/approvals/:token` in `src/App.tsx`; `approvals` reserved in `src/routing/eventFormPaths.ts`; page `src/pages/public/TokenApprovalPage.tsx`; hook `src/hooks/approvals/useTokenApproval.ts` + `src/hooks/approvals/tokenApprovalContracts.ts`; RPC bridge `src/lib/tokenApprovalRpc.ts`; tests `useTokenApproval.test.tsx`, `TokenApprovalPage.test.tsx`, `App.test.tsx`, `eventFormPaths.test.ts`.

## Acceptance criteria

- [x] Portal hosts token approval at `/approvals/:token` with minimal chrome and no dashboard navigation.
- [x] Valid token can approve/reject with required comment rules.
- [x] Invalid/expired/reused/resolved token states are explicit and safe.
- [x] No second participant shell is introduced.

## API / Contract

- Public exports: `src/pages/public/TokenApprovalPage.tsx` (under `public/` for audit/public-route alignment), `src/hooks/approvals/useTokenApproval.ts`, `src/lib/tokenApprovalRpc.ts`.
- Data contracts: BASE token-validation and token-action RPC contracts; participant-safe request context only.
- Security contract: no leakage of hashed token internals; one-time token semantics owned by backend.

## Verification

- Verify approve/reject submissions and error states.

## Testing requirements

- Integration coverage for all token lifecycle states and action validation.

## References

- [../../../pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md](../../../pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md)
- [portal-architecture.md](./portal-architecture.md)
