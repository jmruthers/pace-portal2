# PR06 QA Pack

## Slice metadata

- slice_id: PR06
- app: portal
- requirement_path: docs/requirements/PR06-wizard-field-details.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /profile-complete | 1) Walk through steps 1–3 on /profile-complete. | Step 1 personal, step 2 contact, and step 3 membership field groups render as documented. | - | - |
| S-02 (AC-02) | /profile-complete | 1) On step 1, clear required personal fields and attempt Next. | Validation prevents advancing until required personal fields are satisfied. | - | - |
| S-03 (AC-03) | /profile-complete | 1) On step 2, remove all phone rows or clear residential address and attempt Next. | Validation requires at least one phone number and a residential address before advancing. | - | - |
| S-04 (AC-04) | /profile-complete | 1) Complete step 3 with optional membership fields empty or filled. 2) Finish wizard. | Step 3 can be skipped or completed; save persists membership fields when provided. | - | - |
| S-05 (AC-05) | /profile-complete | 1) Open wizard for user with existing person, member, phones, and addresses. | Existing data appears in the correct step fields before editing. | - | - |
| S-06 (AC-06) | /profile-complete | 1) On step 2 with Google Places available, select an address from autocomplete. 2) Save and revisit step 2. | Displayed address and saved address record reflect the selected place. | - | - |
| S-07 (AC-07) | /profile-complete | 1) On step 2, add, edit, and remove phone rows. 2) Complete wizard. | Phone rows can be added, edited, removed, and persist as a replacement set on save. | - | - |
| S-08 (AC-08) | /profile-complete | 1) Complete wizard for a member with existing membership status. | Save preserves current membership_status normalization behavior without exposing an editable status field. | - | - |
| S-09 (Verification) | /profile-complete | 1) Disable or omit Google Places API key in test environment. 2) Reopen step 2. | Address fields fall back to plain input without breaking the wizard. | - | - |
| S-10 (Verification) | /profile-complete | 1) Navigate back and forth across steps after entering data. | Field values persist across step navigation until save or cancel. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
