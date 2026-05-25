# PR12 QA Pack

## Slice metadata

- slice_id: PR12
- app: portal
- requirement_path: docs/requirements/PR12-contacts-listing.md

## Manual frontend scenarios


| scenario            | route_or_screen      | steps                                                                               | expected_result                                                                           | result | notes |
| ------------------- | -------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | ----- |
| S-01 (AC-01)        | /additional-contacts | 1) Sign in. 2) Open /additional-contacts in self-service mode.                      | Contact cards render with grouped phone rows for the signed-in member.                    | Pass   | -     |
| S-02 (AC-02)        | /additional-contacts | 1) Enter proxy mode for a target member. 2) Open /additional-contacts.              | Target member's contacts load with proxy banner visible.                                  | Pass   | -     |
| S-03 (AC-03)        | /additional-contacts | 1) Open page for member with no additional contacts.                                | Empty state explains no contacts and shows add-contact CTA.                               | Pass   | -     |
| S-04 (AC-04)        | /additional-contacts | 1) Delete a contact from its card. 2) Confirm if prompted.                          | Contact is removed and list refreshes without the deleted card.                           | Pass   | -     |
| S-05 (AC-05)        | /additional-contacts | 1) Inspect populated contact cards.                                                 | Each card shows name, contact type, email, phone numbers, and permission badges.          | Pass   | -     |
| S-06 (AC-06)        | /additional-contacts | 1) Click add-contact CTA.                                                           | Page enters create mode where PR13 owns ContactForm; list contract unchanged underneath.  | Pass   | -     |
| S-07 (AC-07)        | /additional-contacts | 1) Review slice documentation references on the page behavior during test planning. | Rebuild docs keep create/edit ownership in PR13 (validated by handoff behavior in S-06).  | Pass   | -     |
| S-08 (AC-08)        | /additional-contacts | 1) Inspect list, empty state, delete control, and CTA components.                   | pace-core Button, Card, Badge, LoadingSpinner, and PagePermissionGuard patterns are used. | Pass   | -     |
| S-09 (Verification) | /additional-contacts | 1) Delete a contact in proxy mode.                                                  | List refetches and still shows remaining target-member contacts correctly.                | Pass   | -     |


## Test run summary

- overall result: **Pass** — 9/9 manual scenarios passed (S-01 through S-09).
- failed scenarios: None.
- defect links: None recorded for this run.
- retest needed: No — slice meets PR12 acceptance criteria for manual frontend verification (self-service and proxy list load, empty state, delete with refresh, card content, add-contact handoff to PR13, PR12/PR13 ownership split, pace-core list primitives, and proxy delete refetch).

