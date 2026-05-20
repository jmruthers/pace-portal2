# PR20 QA Pack

## Slice metadata

- slice_id: PR20
- app: portal
- requirement_path: docs/requirements/PR20-token-approval-host.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /approvals/:token | 1) Open /approvals/:token with a valid pending token while signed out. | Minimal public page renders without dashboard navigation or second participant shell. | - | - |
| S-02 | AC-02 | /approvals/:token | 1) Resolve valid token. 2) Submit approve without notes. 3) Submit reject without notes. 4) Submit reject with required notes. | Approve succeeds without required comments; reject without comments is blocked; reject with non-empty trimmed notes succeeds. | - | - |
| S-03 | AC-03 | /approvals/:token | 1) Open with invalid, expired, reused, or already-resolved token values. | Each state shows explicit, safe messaging without exposing hashed token internals. | - | - |
| S-04 | AC-04 | /approvals/:token | 1) Compare page chrome to standard authenticated portal pages. | No duplicate participant app shell; page remains a thin standalone approval host. | - | - |
| S-05 | Verification | /approvals/:token | 1) Walk approve and reject submissions including validation errors. | Approve and reject flows surface clear success or error UI for each submission attempt. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
