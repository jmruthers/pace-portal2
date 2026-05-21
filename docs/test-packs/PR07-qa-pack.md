# PR07 QA Pack

## Slice metadata

- slice_id: PR07
- app: portal
- requirement_path: docs/requirements/PR07-member-profile-self-service.md

## Manual frontend scenarios


| scenario            | route_or_screen | steps                                                                                             | expected_result                                                                                       | result | notes |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ----- |
| S-01 (AC-01)        | /member-profile | 1) Sign in. 2) Open /member-profile.                                                              | Current user's profile loads and prefills the form sections.                                          | Pass   | -     |
| S-02 (AC-02)        | /member-profile | 1) Inspect page layout.                                                                           | Personal, contact, and membership information render in sectioned cards with save action.             | Pass   | -     |
| S-03 (AC-03)        | /member-profile | 1) Partially complete required fields and observe progress bar. 2) Fill remaining tracked fields. | Completion progress updates to match shared profile-progress calculation.                             | Pass   | -     |
| S-04 (AC-04)        | /member-profile | 1) Edit person, member, phone, and address fields. 2) Save.                                       | Save persists changes to person, member, phone, and address data successfully.                        | Pass   | -     |
| S-05 (AC-05)        | /member-profile | 1) Submit invalid phone or address data.                                                          | Validation errors appear before save completes.                                                       | Pass   | -     |
| S-06 (AC-06)        | /member-profile | 1) Open /member-profile without active proxy session.                                             | Page is fully usable for self-service editing with standard member copy.                              | Pass   | -     |
| S-07 (AC-07)        | /member-profile | 1) Save profile changes for member with existing status.                                          | Membership status normalization on save matches current portal behavior.                              | Pass   | -     |
| S-08 (Verification) | /member-profile | 1) Open page with proxy mode active if available.                                                 | Proxy banner may appear but self-service page remains functional for own profile when not delegating. | Pass   | -     |
| S-09 (Verification) | /member-profile | 1) Save valid changes.                                                                            | Success navigates user back to /.                                                                     | Pass   | -     |


## Test run summary

- overall result: Pass (9/9 scenarios)
- failed scenarios: None
- defect links: None recorded in this pack
- retest needed: None

