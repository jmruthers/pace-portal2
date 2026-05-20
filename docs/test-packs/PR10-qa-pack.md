# PR10 QA Pack

## Slice metadata

- slice_id: PR10
- app: portal
- requirement_path: docs/requirements/PR10-medical-conditions-crud.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /medical-profile | 1) On /medical-profile, add a new medical condition through the shared modal. | New condition appears in the responsive condition card grid after save. | - | - |
| S-02 | AC-02 | /medical-profile | 1) Edit an existing condition from its card. 2) Save changes. | Updated condition details and badges reflect persisted changes in the list. | - | - |
| S-03 | AC-03 | /medical-profile | 1) Delete a condition from its card. 2) Confirm if prompted. | Condition is removed and the list refreshes without the deleted card. | - | - |
| S-04 | AC-04 | /medical-profile | 1) Inspect condition cards in 1-, 2-, and 3-column layouts. | Cards show compact high-signal badges (name, type path, severity, alert, attachment) without long per-field text blocks. | - | - |
| S-05 | AC-05 | /medical-profile | 1) Add or edit a condition and open condition type selector. | Selected type shows human-readable label/path, including inactive types already on existing records. | - | - |
| S-06 | AC-06 | /medical-profile | 1) Open add flow. 2) Open edit flow on another card. | Both flows use the same shared modal-based MedicalConditionForm editor. | - | - |
| S-07 | AC-07 | /medical-profile | 1) In the condition modal, attach or view action-plan file area. | Action-plan display/upload stays in the same modal context; file lifecycle semantics follow PR11. | - | Lockstep with PR11 per build-queue evidence |
| S-08 | AC-08 | /medical-profile | 1) Inspect modal and card actions. | pace-core primitives are used for modal, buttons, badges, and alerts where applicable. | - | - |
| S-09 | Verification | /medical-profile | 1) Open card attachment link when a file is linked. | Attachment link opens in a new browser tab. | - | - |
| S-10 | Verification | /medical-profile | 1) Add, edit, and delete conditions while in proxy mode for a target member. | Operations apply to the target member context and refresh the delegated member's list. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
