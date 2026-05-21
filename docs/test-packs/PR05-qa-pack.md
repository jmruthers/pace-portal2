# PR05 QA Pack

## Slice metadata

- slice_id: PR05
- app: portal
- requirement_path: docs/requirements/PR05-profile-wizard-shell.md

## Manual frontend scenarios


| scenario            | route_or_screen   | steps                                                                                                 | expected_result                                                                                                            | result | notes |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| S-01 (AC-01)        | /profile-complete | 1) Sign in. 2) Open /profile-complete.                                                                | Route renders only for authenticated users behind the current page guard.                                                  | Pass   | -     |
| S-02 (AC-02)        | /profile-complete | 1) Open /profile-complete with existing profile data.                                                 | Three-step shell shows progress bar, step indicator, and clear current-step state.                                         | Pass   | -     |
| S-03 (AC-03)        | /profile-complete | 1) Open /profile-complete for a user with existing person, member, phone, and address records.        | Fields prefilled in step bodies when data exists (field detail owned by PR06).                                             | Pass   | -     |
| S-04 (AC-04)        | /profile-complete | 1) On step 1, leave required personal fields empty. 2) Attempt Next.                                  | Advancement is blocked with validation feedback; user remains on the failing step.                                         | Pass   | -     |
| S-05 (AC-05)        | /profile-complete | 1) Complete wizard with eventSlug and formSlug query params. 2) Complete wizard without event params. | With event params, completion redirects to /:eventSlug/:formSlug?fromWizard=true; without params, redirects to /dashboard. | Pass   | -     |
| S-06 (AC-06)        | /profile-complete | 1) Exercise loading, failed save, validation error, and Cancel during the wizard.                     | Loading, validation failure, save failure toast, and cancel-to-dashboard states are visible and understandable.            | Pass   | -     |
| S-07 (Verification) | /profile-complete | 1) Open route from protected shell. 2) Observe loading before reference and profile data resolve.     | Loading displays before step content; progress advances only after validation passes and save succeeds per step.           | Pass   | -     |
| S-08 (Verification) | /profile-complete | 1) Use Cancel during the wizard.                                                                      | Cancel returns user to /dashboard.                                                                                         | Pass   | -     |


## Test run summary

- overall result: Pass (8/8 scenarios)
- failed scenarios: None
- defect links: None recorded in this pack
- retest needed: None

