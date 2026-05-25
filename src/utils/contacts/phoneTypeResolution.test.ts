import { describe, expect, it } from 'vitest';
import { resolvePhoneTypeIdFromLabel } from '@/utils/contacts/phoneTypeResolution';

const phoneTypes = [
  { id: 1, name: 'Mobile' },
  { id: 2, name: 'Home' },
] as const;

describe('resolvePhoneTypeIdFromLabel', () => {
  it('returns null for empty labels', () => {
    expect(resolvePhoneTypeIdFromLabel('', phoneTypes)).toBeNull();
    expect(resolvePhoneTypeIdFromLabel(null, phoneTypes)).toBeNull();
  });

  it('matches phone type names case-insensitively', () => {
    expect(resolvePhoneTypeIdFromLabel('mobile', phoneTypes)).toBe(1);
    expect(resolvePhoneTypeIdFromLabel(' Home ', phoneTypes)).toBe(2);
  });

  it('returns null when no reference row matches', () => {
    expect(resolvePhoneTypeIdFromLabel('Work', phoneTypes)).toBeNull();
  });
});
