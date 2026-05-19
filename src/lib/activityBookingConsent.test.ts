import { describe, expect, it } from 'vitest';
import {
  computeOfferingConsentProjection,
  offeringConsentText,
} from '@/lib/activityBookingConsent';

describe('activityBookingConsent', () => {
  describe('offeringConsentText', () => {
    it('returns trimmed description when non-empty', () => {
      expect(offeringConsentText('  Waiver text  ')).toBe('Waiver text');
    });

    it('returns null for empty or whitespace description', () => {
      expect(offeringConsentText(null)).toBeNull();
      expect(offeringConsentText('   ')).toBeNull();
    });
  });

  describe('computeOfferingConsentProjection', () => {
    it('requires consent when description exists and offering not yet consented', () => {
      const result = computeOfferingConsentProjection(
        { id: 'off-1', description: 'Activity waiver' },
        new Set()
      );
      expect(result.consentRequired).toBe(true);
      expect(result.consentText).toBe('Activity waiver');
    });

    it('does not require consent when offering already has waiver on file', () => {
      const result = computeOfferingConsentProjection(
        { id: 'off-1', description: 'Activity waiver' },
        new Set(['off-1'])
      );
      expect(result.consentRequired).toBe(false);
      expect(result.consentText).toBe('Activity waiver');
    });

    it('does not require consent when description is empty', () => {
      const result = computeOfferingConsentProjection(
        { id: 'off-1', description: null },
        new Set()
      );
      expect(result.consentRequired).toBe(false);
      expect(result.consentText).toBeNull();
    });
  });
});
