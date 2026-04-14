import { describe, expect, it } from 'vitest';
import { isReservedEventSlug, RESERVED_EVENT_SLUGS } from '@/routing/eventFormPaths';

describe('eventFormPaths', () => {
  it('marks known app routes as reserved first segments', () => {
    expect(isReservedEventSlug('login')).toBe(true);
    expect(isReservedEventSlug('dashboard')).toBe(true);
    expect(isReservedEventSlug('profile-complete')).toBe(true);
    expect(isReservedEventSlug('profile')).toBe(true);
  });

  it('does not reserve typical event slugs', () => {
    expect(isReservedEventSlug('summer-gala')).toBe(false);
    expect(isReservedEventSlug('evt-2026')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReservedEventSlug('LOGIN')).toBe(true);
  });

  it('documents reserved keys for route ordering reviews', () => {
    expect(RESERVED_EVENT_SLUGS.size).toBeGreaterThan(0);
  });
});
