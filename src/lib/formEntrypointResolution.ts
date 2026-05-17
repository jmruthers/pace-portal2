/**
 * PR17 — Form journey route entry discriminant shared by shells and adapters.
 */

export type FormEntrypoint =
  | { kind: 'event_application'; eventSlug: string }
  | { kind: 'event_form'; eventSlug: string; formSlug: string }
  | { kind: 'org_form'; formSlug: string };
