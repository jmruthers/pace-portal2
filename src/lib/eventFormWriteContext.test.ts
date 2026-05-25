import { describe, expect, it } from 'vitest';
import { resolveEventFormWriteOrganisationId } from '@/lib/eventFormWriteContext';

describe('eventFormWriteContext', () => {
  it('returns trimmed event organisation id', () => {
    expect(resolveEventFormWriteOrganisationId(' org-event ')).toBe('org-event');
  });

  it('returns null for empty values', () => {
    expect(resolveEventFormWriteOrganisationId(null)).toBeNull();
    expect(resolveEventFormWriteOrganisationId('   ')).toBeNull();
  });
});
