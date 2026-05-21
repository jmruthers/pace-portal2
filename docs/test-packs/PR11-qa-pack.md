# PR11 QA Pack

## Slice metadata

- slice_id: PR11
- app: portal
- requirement_path: docs/requirements/PR11-action-plan-files.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /medical-profile | 1) Open edit modal for a condition with an existing action-plan file. | Existing file is shown inline in the modal with open/download affordance. | - | - |
| S-02 (AC-02) | /medical-profile | 1) Upload a new action-plan file for a saved condition. 2) Replace with another valid file. | File attaches to the condition and replacement updates the displayed linked file. | - | - |
| S-03 (AC-03) | /medical-profile | 1) Attempt upload with unsupported MIME type. 2) Attempt upload over 10 MB. | Upload is rejected before save with clear feedback; no file link is created. | - | - |
| S-04 (AC-04) | /medical-profile | 1) Open linked action-plan from modal or card. | File opens in a new tab from inline medical-profile UI without navigating to a dedicated viewer route. | - | - |
| S-05 (AC-05) | /medical-profile | 1) Open a file type the browser cannot preview in-tab. | Download fallback is still offered so the user can access the document. | - | - |
| S-06 (AC-06) | /medical-profile | 1) Simulate link failure after a successful upload if reproducible in test environment. | User sees an explicit error when the condition row is not updated with the new file reference. | - | - |
| S-07 (AC-07) | /medical-profile | 1) Delete a condition that has a linked action-plan file. | Condition delete also cleans up the linked file reference from the member-facing list and modal state. | - | - |
| S-08 (AC-08) | /medical-profile | 1) Upload and open files in proxy mode for a target member. | File workflow works under the same organisation and proxy context as the parent medical profile page. | - | - |
| S-09 (AC-09) | /medical-profile | 1) Inspect medical profile summary field groups outside the condition modal. | File slice does not add condition CRUD fields or unrelated summary field editing beyond PR09. | - | - |
| S-10 (AC-10) | /medical-profile | 1) Inspect file picker and file display in the modal. | pace-core Button and FileDisplay (or approved native picker pattern) are used for upload and open behavior. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
