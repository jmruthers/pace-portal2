import { describe, expect, it } from 'vitest';
import { medicalProfileSchema, mapMediProfileRowToFormValues } from '@/utils/medical-profile/validation';

describe('medicalProfileSchema', () => {
  it('rejects dietary comments when dietary requirements are enabled but comments empty', () => {
    const r = medicalProfileSchema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      has_dietary_requirements: true,
      dietary_comments: '',
      menu_selection: '',
      is_fully_immunised: false,
      last_tetanus_date: '',
      requires_support: false,
      support_details: '',
      has_carer: false,
      carer_name: '',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a minimal valid payload', () => {
    const r = medicalProfileSchema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      has_dietary_requirements: false,
      dietary_comments: '',
      menu_selection: 'x',
      is_fully_immunised: true,
      last_tetanus_date: '',
      requires_support: false,
      support_details: '',
      has_carer: false,
      carer_name: '',
    });
    expect(r.success).toBe(true);
  });
});

describe('mapMediProfileRowToFormValues', () => {
  it('maps null row to defaults', () => {
    const v = mapMediProfileRowToFormValues(null);
    expect(v.medicare_number).toBe('');
    expect(v.has_carer).toBe(false);
  });
});
