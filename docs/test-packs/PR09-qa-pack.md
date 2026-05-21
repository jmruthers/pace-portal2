# PR09 QA Pack

## Slice metadata

- slice_id: PR09
- app: portal
- requirement_path: docs/requirements/PR09-medical-profile-summary.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /medical-profile | 1) Sign in with completed member profile. 2) Open /medical-profile. | Route renders behind page permission guard with summary layout intact. | - | - |
| S-02 (AC-02) | /medical-profile | 1) Open /medical-profile with incomplete member profile. | User is blocked with explanation and directed to complete member profile at /member-profile. | - | - |
| S-03 (AC-03) | /medical-profile | 1) Open /medical-profile in self-service mode. 2) Repeat in proxy mode for a target member. | Both modes render summary with appropriate target-member copy and proxy banner when delegating. | - | - |
| S-04 (AC-04) | /medical-profile | 1) Edit summary fields. 2) Save using top and bottom save actions. | Medical profile data persists; success or validation feedback is shown for both save buttons. | - | - |
| S-05 (AC-05) | /medical-profile | 1) Change key summary fields and observe progress bar. | Completion progress indicator updates from profile completeness rules. | - | - |
| S-06 (AC-06) | /medical-profile | 1) Inspect conditions area on summary page. | Condition management is presented as handoff or read-only summary; CRUD and file lifecycle remain in PR10/PR11. | - | - |
| S-07 (AC-07) | /medical-profile | 1) Inspect controls used on the page. | pace-core Card, Button, Progress, LoadingSpinner, and ProxyModeBanner (when applicable) are used rather than bespoke controls. | - | - |
| S-08 (Verification) | /medical-profile | 1) Save invalid or incomplete required summary data. | Validation feedback appears before successful save. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
