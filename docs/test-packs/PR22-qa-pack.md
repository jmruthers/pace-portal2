# PR22 QA Pack

## Slice metadata

- slice_id: PR22
- app: portal
- requirement_path: docs/requirements/PR22-my-memberships.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /my-memberships | 1) Sign in. 2) Open /my-memberships. | Page renders behind PagePermissionGuard for authenticated members. | - | - |
| S-02 (AC-02) | /my-memberships | 1) Open page as member with no core_member records. | Empty state explains no memberships and shows Add Organisation CTA. | - | - |
| S-03 (AC-03) | /my-memberships | 1) View memberships in Awaiting approval, Under review, Active, Not approved, and terminal statuses. | Each card shows org name and display state per membership_status and team_member_request.status rules. | - | - |
| S-04 (AC-04) | /my-memberships | 1) Click Add Organisation from empty state or list header. | Inline join/transfer flow opens on the same route without URL change. | - | - |
| S-05 (AC-05) | /my-memberships | 1) Complete join flow: request type, org search, membership type when needed, org signup form step. | Flow collects documented steps and renders org_signup form via shared FormRenderer or minimal review when no published form exists. | - | - |
| S-06 (AC-06) | /my-memberships | 1) Submit valid join request end-to-end. | app_submit_member_request succeeds and confirmation screen appears. | - | - |
| S-07 (AC-07) | /my-memberships | 1) Attempt submit with incomplete profile. 2) Attempt duplicate pending request for same org. 3) Attempt ineligible membership type by age. | Each case shows inline pre-submit error without calling submit RPC. | - | - |
| S-08 (AC-08) | /my-memberships | 1) Start Transfer request type. | Source org selection step appears and is required before submit. | - | - |
| S-09 (AC-09) | /my-memberships | 1) After successful submit, return to list without manual full reload. | New Awaiting approval card appears in the membership list. | - | - |
| S-10 (AC-10) | /my-memberships | 1) Open Declined membership card. 2) Tap Apply again. | Apply again re-enters join flow for the same org. | - | - |
| S-11 (AC-11) | /my-memberships | 1) Inspect page for payment or billing entry points. | No payment or billing behavior is introduced on my-memberships. | - | - |
| S-12 (Verification) | /my-memberships | 1) Complete join flow end-to-end including confirmation. | Org search, membership type, form, submit, and confirmation match documented inline step sequence. | - | - |
| S-13 (Verification) | /profile-complete | 1) Complete or skip wizard Step 5 targeting memberships. | User can reach /my-memberships from wizard completion redirect. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
