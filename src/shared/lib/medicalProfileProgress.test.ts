import { describe, expect, it } from 'vitest';
import { computeMedicalProfileProgress } from '@/shared/lib/medicalProfileProgress';
import { defaultMedicalProfileFormValues } from '@/utils/medical-profile/validation';

describe('computeMedicalProfileProgress', () => {
  it('returns zero completion for empty defaults', () => {
    const r = computeMedicalProfileProgress(defaultMedicalProfileFormValues());
    expect(r.totalFields).toBe(9);
    expect(r.filledFields).toBeLessThan(r.totalFields);
    expect(r.completionRatio).toBeGreaterThanOrEqual(0);
    expect(r.completionRatio).toBeLessThanOrEqual(1);
  });

  it('increases completion when key fields are filled', () => {
    const base = defaultMedicalProfileFormValues();
    const low = computeMedicalProfileProgress(base);
    const high = computeMedicalProfileProgress({
      ...base,
      medicare_number: '123',
      medicare_expiry: '2030-01-01',
      menu_selection: 'Standard',
      last_tetanus_date: '2020-01-01',
    });
    expect(high.filledFields).toBeGreaterThan(low.filledFields);
  });
});
