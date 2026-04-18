# PR20 — Token approval host surfaces

## Overview

- Purpose and scope: host guardian/referee token approval pages in portal as thin standalone member-adjacent surfaces aligned to BASE S07 contracts.
- Dependencies: PR01, BASE S07.
- Recommended canonical route: `/approvals/:token` (public entry, minimal chrome, no app navigation).

## Acceptance criteria

- [ ] Portal hosts token approval at `/approvals/:token` with minimal chrome and no dashboard navigation.
- [ ] Valid token can approve/reject with required comment rules.
- [ ] Invalid/expired/reused/resolved token states are explicit and safe.
- [ ] No second participant shell is introduced.

## API / Contract

- Public exports: `src/pages/approvals/TokenApprovalPage.tsx`, `src/hooks/approvals/useTokenApproval.ts`.
- Data contracts: BASE token-validation and token-action RPC contracts; participant-safe request context only.
- Security contract: no leakage of hashed token internals; one-time token semantics owned by backend.

## Verification

- Verify approve/reject submissions and error states.

## Testing requirements

- Integration coverage for all token lifecycle states and action validation.

## References

- [../base/slices/S07-token-approval-actions_requirements.md](../base/slices/S07-token-approval-actions_requirements.md)
- [PR00-portal-architecture.md](./PR00-portal-architecture.md)
