# PR19 QA Pack

## Slice metadata

- slice_id: PR19
- app: portal
- requirement_path: docs/requirements/PR19-activity-booking.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01 | /:eventSlug | 1) Open participant event hub for an event with activities. 2) Follow activities entry to booking journey. | Booking journey is reachable from the participant event hub. | - | - |
| S-02 | AC-02 | /:eventSlug/activities | 1) Browse offerings and sessions. 2) Create a booking where rules allow. 3) Cancel a future booking where allowed. | Participant can browse, book, and cancel bookings per capacity, window, duplicate, conflict, and consent rules before persistence. | - | - |
| S-03 | AC-03 | /:eventSlug/activities | 1) Attempt book when at capacity, outside window, duplicate, or missing consent when waiver text exists. | UI blocks or explains failure before persisting invalid bookings. | - | Consent projected from offering description per requirement |
| S-04 | AC-04 | /:eventSlug/activities | 1) Book a session. 2) Attempt to reschedule to another session. | Cancel-only edit semantics apply; participant can cancel but cannot reschedule sessions in this slice. | - | - |
| S-05 | Verification | /:eventSlug/activities | 1) Exercise browse, successful book, waitlist or blocked outcome if shown, and cancel-before-close path. | Each outcome shows participant-safe messaging without organiser-only controls. | - | Proxy: browse allowed; book and cancel disabled in proxy mode |
| S-06 | Verification | /:eventSlug/activities | 1) Enter activities route in proxy mode. | Browse UI is available; book and cancel actions are disabled when proxy is active. | - | - |

## Test run summary

- overall result: -
- failed scenarios: -
- defect links: -
- retest needed: -
