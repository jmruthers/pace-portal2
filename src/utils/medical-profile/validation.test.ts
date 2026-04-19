import { describe, expect, it } from 'vitest';
import {
  createMedicalProfileSchema,
  mapMediProfileRowToFormValues,
  medicalProfileSchema,
  resolveMenuSelectionToDietId,
} from '@/utils/medical-profile/validation';

const sampleDiets = [
  {
    diettype_id: '1',
    diettype_code: 'ST',
    diettype_name: 'Standard',
    diettype_description: 'Nut free',
  },
  {
    diettype_id: '16',
    diettype_code: 'OT',
    diettype_name: 'Other',
    diettype_description: null,
  },
] as const;

describe('medicalProfileSchema', () => {
  it('rejects when menu selection is empty', () => {
    const r = medicalProfileSchema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: '',
      menu_selection: '',
      is_fully_immunised: false,
      last_tetanus_date: '',
    });
    expect(r.success).toBe(false);
  });

  it('accepts a minimal valid payload with menu selected', () => {
    const r = medicalProfileSchema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: '',
      menu_selection: '1',
      is_fully_immunised: true,
      last_tetanus_date: '',
    });
    expect(r.success).toBe(true);
  });
});

describe('createMedicalProfileSchema (OT)', () => {
  it('rejects Other without dietary comments', () => {
    const schema = createMedicalProfileSchema(sampleDiets);
    const r = schema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: '',
      menu_selection: '16',
      is_fully_immunised: false,
      last_tetanus_date: '',
    });
    expect(r.success).toBe(false);
  });

  it('accepts Other with dietary comments', () => {
    const schema = createMedicalProfileSchema(sampleDiets);
    const r = schema.safeParse({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: 'No shellfish',
      menu_selection: '16',
      is_fully_immunised: false,
      last_tetanus_date: '',
    });
    expect(r.success).toBe(true);
  });
});

describe('mapMediProfileRowToFormValues', () => {
  it('maps null row to defaults', () => {
    const v = mapMediProfileRowToFormValues(null);
    expect(v.medicare_number).toBe('');
    expect(v.menu_selection).toBe('');
  });

  it('resolves legacy menu text to diet id when stored value matches a diet name', () => {
    const row = {
      diet_type_id: 'Standard Menu',
      medicare_number: null,
      medicare_expiry: null,
      health_care_card_number: null,
      health_care_card_expiry: null,
      health_fund_name: null,
      health_fund_number: null,
      dietary_comments: null,
      is_fully_immunised: null,
      last_tetanus_date: null,
    } as never;

    const diets = [
      { diettype_id: '99', diettype_code: 'ST', diettype_name: 'Standard Menu', diettype_description: null },
    ] as never;

    const v = mapMediProfileRowToFormValues(row, diets);
    expect(v.menu_selection).toBe('99');
  });
});

describe('resolveMenuSelectionToDietId', () => {
  it('returns empty when stored value is blank', () => {
    expect(resolveMenuSelectionToDietId('  ', [])).toBe('');
  });

  it('returns id when it matches a diet row', () => {
    const diets = [
      { diettype_id: '7', diettype_code: 'ST', diettype_name: 'Standard', diettype_description: null },
    ] as never;
    expect(resolveMenuSelectionToDietId('7', diets)).toBe('7');
  });

  it('matches stored text to diet name case-insensitively', () => {
    const diets = [
      { diettype_id: '7', diettype_code: 'ST', diettype_name: 'Standard Menu', diettype_description: null },
    ] as never;
    expect(resolveMenuSelectionToDietId('standard menu', diets)).toBe('7');
  });
});

