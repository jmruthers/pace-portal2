# PR15 QA Pack

## Slice metadata

- slice_id: PR15
- app: portal
- requirement_path: docs/requirements/PR15-authenticated-form-rendering.md

## Manual frontend scenarios

| scenario | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 (AC-01) | /:eventSlug/:formSlug | 1) Sign in. 2) Open a known event and form slug pair. | Correct event and form header, description, and dynamic field set render for resolved slugs. | - | - |
| S-02 (AC-02) | /:eventSlug/:formSlug | 1) While signed out, open event form URL. 2) Complete sign-in handoff. | Auth-required handoff is explicit; authenticated user lands in the form experience after sign-in. | - | - |
| S-03 (AC-03) | /:eventSlug/:formSlug | 1) Open form with existing person or member field mappings. | Matching values prefill editable fields where data exists. | - | - |
| S-04 (AC-04) | /:eventSlug/:formSlug | 1) Open form configured with profile confirmation blocks. | Required confirmation sections render and block submit when not satisfied. | - | - |
| S-05 (AC-05) | /:eventSlug/application | 1) Start or resume an event application form. | Draft application record is created or reused for the event form workflow. | - | - |
| S-06 (AC-06) | /:eventSlug/:formSlug | 1) Enter field values. 2) Leave and return to the same form in the same session. | Draft responses restore previously entered values on resume. | - | - |
| S-07 (AC-07) | /:eventSlug/:formSlug | 1) Open a form containing an unsupported field type in test data. | Page shows non-crashing Alert or read-only fallback for that field without breaking the whole form. | - | - |
| S-08 (Verification) | /:eventSlug/:formSlug | 1) Open form as user needing profile completion. 2) Repeat in proxy mode. | Profile gate blocks incomplete users; proxy mode bypasses gate per requirement; draft resume still works when allowed in. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
