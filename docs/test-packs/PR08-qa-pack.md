# PR08 QA Pack

## Slice metadata

- slice_id: PR08
- app: portal
- requirement_path: docs/requirements/PR08-proxy-delegated-editing.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /dashboard | 1) On dashboard linked profiles, open profiles with view-only and edit-capable access. | View access opens /profile/view/:memberId; edit access opens /profile/edit/:memberId. | - | - |
| S-02 | AC-02 | /profile/edit/:memberId | 1) Start delegated edit from linked profile. | Proxy session validates before workspace and target data load. | - | - |
| S-03 | AC-03 | /profile/edit/:memberId | 1) Load edit proxy with stale or self-targeting local proxy state if reproducible. | Invalid proxy state is cleared; user is not left in a broken delegated session. | - | - |
| S-04 | AC-04 | /profile/view/:memberId | 1) Open read-only profile with view-only access. 2) Repeat with edit-capable access. | Read-only summary renders; Edit button appears only when edit access is permitted. | - | - |
| S-05 | AC-05 | /profile/edit/:memberId | 1) Enter delegated edit workspace. | Proxy banner and delegated member context are visible on the workspace page. | - | - |
| S-06 | AC-06 | /profile/edit/:memberId | 1) Attempt to use only manipulated localStorage proxy payload without server access. | Protected reads and writes remain denied; local proxy state alone does not authorize access. | - | - |
| S-07 | AC-07 | /profile/edit/:memberId | 1) From delegated workspace, open member profile, medical, contacts, or event entry surfaces available for the target. | Delegated user can reach in-scope portal capabilities for the target member equivalent to self-service scope (excluding billing). | - | - |
| S-08 | AC-08 | /profile/edit/:memberId | 1) Inspect delegated workspace composition. | SmartBillingCard and other billing or payment UI are not present in the delegated workspace. | - | - |
| S-09 | AC-09 | /profile/edit/:memberId | 1) Revoke delegated access while stale proxy state remains in browser storage. 2) Reload delegated routes. | Access is rejected and stale proxy state is cleared even if localStorage still held prior values. | - | - |
| S-10 | Verification | /profile/view/:memberId | 1) Open view route for inaccessible target member. | Access denied or no-access state renders without exposing target profile data. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
