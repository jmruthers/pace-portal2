# PR13 QA Pack

## Slice metadata

- slice_id: PR13
- app: portal
- requirement_path: docs/requirements/PR13-contact-create-edit-flow.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /additional-contacts | 1) Click add contact. 2) Complete email lookup or manual path through save. | New contact appears in the list after successful create. | - | - |
| S-02 | AC-02 | /additional-contacts | 1) Add contact with email matching an existing person not yet linked. 2) Choose link or create-new paths. | User can complete link flow or manual create-new path per match confirmation step. | - | - |
| S-03 | AC-03 | /additional-contacts | 1) Start add flow without providing an email. 2) Complete manual no-email branch. | Contact can be created through the manual branch when no email is supplied. | - | - |
| S-04 | AC-04 | /additional-contacts | 1) Open edit on an existing contact card. 2) Save changes. | Edit mode opens prefilled full form (skipping email step) and persists updates. | - | - |
| S-05 | AC-05 | /additional-contacts | 1) Create or edit a contact while in proxy mode for a target member. | Mutations apply to the target member's contact list and refresh after save. | - | - |
| S-06 | AC-06 | /additional-contacts | 1) Submit create or edit with missing required fields. | Inline validation errors appear before save completes. | - | - |
| S-07 | AC-07 | /additional-contacts | 1) Attempt to link a person who is already linked in the active contact set. | Flow blocks duplicate linking with a clear message directing user to edit the existing contact. | - | - |
| S-08 | AC-08 | /additional-contacts | 1) During email match for an already-linked person, attempt to link again. | Duplicate linking is blocked; user is told to edit the existing list contact instead. | - | - |
| S-09 | AC-09 | /additional-contacts | 1) In proxy mode, attempt duplicate link using delegate's own contacts as false signal. | Duplicate detection evaluates target member's contacts only. | - | - |
| S-10 | AC-10 | /additional-contacts | 1) After create, edit, or delete from PR13 flow, return to list view. | Contact list refreshes to show current data without manual full reload. | - | - |
| S-11 | AC-11 | /additional-contacts | 1) Walk through email, match, relationship, and full-form steps. | Inline editor uses pace-core Form, Input, Select, Alert, Checkbox, and Button primitives. | - | - |
| S-12 | Verification | /additional-contacts | 1) Complete add, match, manual no-email, edit, and proxy flows end-to-end. | Each branching path completes with list refresh and appropriate success or blocking states. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
