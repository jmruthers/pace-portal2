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
  'my-memberships',
  'profile',
  /** Top-level `/forms/*` journey; must not resolve as `/:eventSlug` hub. */
  'forms',
  /** PR19 participant activity booking; must not resolve as `/:eventSlug` hub. */
  'activities',
  /** PR21 participant itinerary; must not resolve as `/:eventSlug` hub. */
  'itinerary',
]);

export function isReservedEventSlug(slug: string): boolean {
  return RESERVED_EVENT_SLUGS.has(slug.toLowerCase());
}

/** PR18 authenticated participant route `/:eventSlug/applications/:applicationId`. */
export function eventApplicationProgressPath(eventSlug: string, applicationId: string): string {
  const s = eventSlug.trim();
  const id = applicationId.trim();
  return `/${encodeURIComponent(s)}/applications/${encodeURIComponent(id)}`;
}

/** PR19 authenticated participant route `/:eventSlug/activities`. */
export function eventActivityBookingPath(eventSlug: string): string {
  const s = eventSlug.trim();
  return `/${encodeURIComponent(s)}/activities`;
}

/** PR21 authenticated participant route `/:eventSlug/itinerary`. */
export function eventItineraryPath(eventSlug: string): string {
  const s = eventSlug.trim();
  return `/${encodeURIComponent(s)}/itinerary`;
}
