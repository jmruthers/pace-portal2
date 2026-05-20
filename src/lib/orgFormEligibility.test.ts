import { describe, expect, it } from 'vitest';
import {
  getOrgFormEligibilityFailure,
  orgFormWithinResponseWindow,
} from '@/lib/orgFormEligibility';
import type { CoreFormRow } from '@/lib/orgFormEligibility';

function form(over: Partial<CoreFormRow> = {}): CoreFormRow {
  return {
    access_mode: 'authenticated_member',
    is_active: true,
    opens_at: null,
    closes_at: null,
    ...over,
  } as CoreFormRow;
}

describe('orgFormEligibility', () => {
  it('orgFormWithinResponseWindow allows open forms', () => {
    expect(orgFormWithinResponseWindow({ opens_at: null, closes_at: null })).toBe(true);
  });

  it('orgFormWithinResponseWindow rejects before opens_at', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(orgFormWithinResponseWindow({ opens_at: future, closes_at: null }, new Date())).toBe(
      false
    );
  });

  it('getOrgFormEligibilityFailure rejects wrong access_mode', () => {
    expect(getOrgFormEligibilityFailure(form({ access_mode: 'public' }))?.code).toBe(
      'FORM_ACCESS_MODE'
    );
  });

  it('getOrgFormEligibilityFailure rejects inactive forms', () => {
    expect(getOrgFormEligibilityFailure(form({ is_active: false }))?.code).toBe('FORM_INACTIVE');
  });
});
