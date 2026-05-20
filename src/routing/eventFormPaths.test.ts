import { describe, expect, it } from 'vitest';
import {
  eventActivityBookingPath,
  eventApplicationProgressPath,
  eventItineraryPath,
  isReservedEventSlug,
  RESERVED_EVENT_SLUGS,
} from '@/routing/eventFormPaths';

describe('eventFormPaths', () => {
  it('marks known app routes as reserved first segments', () => {
    expect(isReservedEventSlug('login')).toBe(true);
    expect(isReservedEventSlug('dashboard')).toBe(true);
    expect(isReservedEventSlug('profile-complete')).toBe(true);
    expect(isReservedEventSlug('profile')).toBe(true);
    expect(isReservedEventSlug('approvals')).toBe(true);
  });

  it('marks forms as a reserved first segment for hub routing', () => {
    expect(isReservedEventSlug('forms')).toBe(true);
    expect(isReservedEventSlug('FORMS')).toBe(true);
  });

  it('marks activities as a reserved first segment for hub routing', () => {
    expect(isReservedEventSlug('activities')).toBe(true);
    expect(isReservedEventSlug('ACTIVITIES')).toBe(true);
  });

  it('marks itinerary as a reserved first segment for hub routing', () => {
    expect(isReservedEventSlug('itinerary')).toBe(true);
    expect(isReservedEventSlug('ITINERARY')).toBe(true);
  });

  it('marks my-memberships as a reserved first segment for hub routing', () => {
    expect(isReservedEventSlug('my-memberships')).toBe(true);
    expect(isReservedEventSlug('MY-MEMBERSHIPS')).toBe(true);
  });

  it('does not reserve typical event slugs', () => {
    expect(isReservedEventSlug('summer-gala')).toBe(false);
    expect(isReservedEventSlug('evt-2026')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReservedEventSlug('LOGIN')).toBe(true);
  });

  it('builds participant application progress path', () => {
    expect(eventApplicationProgressPath('summer-gala', '11111111-1111-4111-a111-111111111111')).toBe(
      '/summer-gala/applications/11111111-1111-4111-a111-111111111111'
    );
  });

  it('builds participant activity booking path', () => {
    expect(eventActivityBookingPath('summer-gala')).toBe('/summer-gala/activities');
  });

  it('builds participant itinerary path', () => {
    expect(eventItineraryPath('summer-gala')).toBe('/summer-gala/itinerary');
  });

  it('documents reserved keys for route ordering reviews', () => {
    expect(RESERVED_EVENT_SLUGS.size).toBeGreaterThan(0);
  });
});
