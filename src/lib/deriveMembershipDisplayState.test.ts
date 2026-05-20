import { describe, expect, it } from 'vitest';
import { deriveMembershipDisplayState } from '@/lib/deriveMembershipDisplayState';

describe('deriveMembershipDisplayState', () => {
  it('maps Provisional + pending to awaiting approval', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Provisional',
      requestStatus: 'pending',
    });
    expect(r.displayKind).toBe('awaiting_approval');
    expect(r.displayLabel).toBe('Awaiting approval');
  });

  it('maps Provisional + on_hold to under review', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Provisional',
      requestStatus: 'on_hold',
    });
    expect(r.displayKind).toBe('under_review');
    expect(r.displayLabel).toBe('Under review');
  });

  it('maps Active to active', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Active',
      requestStatus: null,
    });
    expect(r.displayKind).toBe('active');
    expect(r.showApplyAgain).toBe(false);
  });

  it('maps Declined to not approved with apply again', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Declined',
      requestStatus: null,
    });
    expect(r.displayKind).toBe('not_approved');
    expect(r.showApplyAgain).toBe(true);
  });

  it('maps Provisional + rejected to not approved', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Provisional',
      requestStatus: 'rejected',
    });
    expect(r.displayKind).toBe('not_approved');
    expect(r.showApplyAgain).toBe(true);
  });

  it('maps Suspended to terminal', () => {
    const r = deriveMembershipDisplayState({
      membershipStatus: 'Suspended',
      requestStatus: null,
    });
    expect(r.displayKind).toBe('terminal');
    expect(r.displayLabel).toBe('Suspended');
  });
});
