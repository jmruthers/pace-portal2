import { describe, expect, it } from 'vitest';
import { normalizeMembershipStatus } from '@/hooks/member-profile/usePersonOperations';

describe('normalizeMembershipStatus', () => {
  it('returns valid input when it matches enum', () => {
    expect(normalizeMembershipStatus('Provisional', 'Active')).toBe('Active');
  });

  it('falls back to existing when input is invalid', () => {
    expect(normalizeMembershipStatus('Suspended', 'not-a-status')).toBe('Suspended');
  });

  it('defaults to Provisional when both invalid', () => {
    expect(normalizeMembershipStatus(null, 'x')).toBe('Provisional');
  });
});
