import { describe, expect, it } from 'vitest';
import { computeMedicalProfileProgress } from '@/shared/lib/medicalProfileProgress';
import { defaultMedicalProfileFormValues } from '@/utils/medical-profile/validation';

const diets = [
  {
    diettype_id: '1',
    diettype_code: 'ST',
    diettype_name: 'Standard',
    diettype_description: '',
  },
  {
    diettype_id: '16',
    diettype_code: 'OT',
    diettype_name: 'Other',
    diettype_description: null,
  },
] as const;

describe('computeMedicalProfileProgress', () => {
  it('returns low completion for empty defaults', () => {
    const r = computeMedicalProfileProgress(defaultMedicalProfileFormValues(), diets);
    expect(r.totalFields).toBe(6);
    expect(r.filledFields).toBeLessThan(r.totalFields);
    expect(r.completionRatio).toBeGreaterThanOrEqual(0);
    expect(r.completionRatio).toBeLessThanOrEqual(1);
  });

  it('increases completion when key fields are filled', () => {
    const base = defaultMedicalProfileFormValues();
    const low = computeMedicalProfileProgress(base, diets);
    const high = computeMedicalProfileProgress(
      {
        ...base,
        medicare_number: '123',
        medicare_expiry: '2030-01-01',
        menu_selection: '1',
        last_tetanus_date: '2020-01-01',
      },
      diets
    );
    expect(high.filledFields).toBeGreaterThan(low.filledFields);
  });

  it('requires dietary comments when Other is selected', () => {
    const base = defaultMedicalProfileFormValues();
    const withoutComments = computeMedicalProfileProgress(
      { ...base, menu_selection: '16' },
      diets
    );
    const withComments = computeMedicalProfileProgress(
      { ...base, menu_selection: '16', dietary_comments: 'Details' },
      diets
    );
    expect(withComments.filledFields).toBeGreaterThan(withoutComments.filledFields);
  });
});
