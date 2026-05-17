/** First path segment must not be mistaken for an event slug (PR00 route model). */
export const RESERVED_EVENT_SLUGS = new Set([
  'login',
  'register',
  'approvals',
  'dashboard',
  'profile-complete',
  'member-profile',
  'medical-profile',
  'additional-contacts',
  'profile',
  /** Top-level `/forms/*` journey; must not resolve as `/:eventSlug` hub. */
  'forms',
]);

export function isReservedEventSlug(slug: string): boolean {
  return RESERVED_EVENT_SLUGS.has(slug.toLowerCase());
}
