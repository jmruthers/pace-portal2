# PR17 QA Pack

## Slice metadata

- slice_id: PR17
- app: portal
- requirement_path: docs/requirements/PR17-form-journey-shell.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /:eventSlug/application, /:eventSlug/:formSlug, /forms/:formSlug | 1) Open each route context while authenticated. | Shared form journey shell renders for event application, event form slug, and org form slug routes. | - | - |
| S-02 | AC-02 | /:eventSlug/:formSlug | 1) While signed out, open an event form journey URL. 2) Sign in. | Auth-required handoff preserves return URL; authenticated member context is required by default. | - | - |
| S-03 | AC-03 | /:eventSlug/application, /forms/:formSlug | 1) Open journey with no prior draft (start). 2) Open with saved draft (resume). 3) Open submitted event registration (view). | Shell shows intro/start, resume fill, or read-only view-submitted states appropriately per workflow. | - | - |
| S-04 | AC-04 | /:eventSlug/:formSlug | 1) Start journey and save draft values. 2) Leave and return. | Draft create, reuse, and restore occur through typed hooks without duplicating submit side effects in the shell. | - | - |
| S-05 | AC-05 | /:eventSlug/:formSlug | 1) Render form containing unsupported field type. | Unsupported field shows safe fallback; journey does not crash. | - | - |
| S-06 | Verification | /forms/:formSlug | 1) Open org form slug journey. 2) Attempt final org submit if exposed. | Authenticated load, intro, and fill work; org draft persistence and submit remain deferred per implementation notes. | - | Org submit deferred per requirement |
| S-07 | Verification | /:eventSlug/application | 1) Complete event base_registration submit through journey. | Submit hands off to PR16 adapter; success routing follows event registration workflow. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
