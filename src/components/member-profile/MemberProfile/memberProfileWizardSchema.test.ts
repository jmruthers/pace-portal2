import { describe, expect, it } from 'vitest';
import {
  buildMemberProfileFormDefaults,
  emptyMemberProfileFormValues,
  memberProfileWizardFormSchema,
  validateMemberProfileWizardStep,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';

describe('validateMemberProfileWizardStep', () => {
  it('rejects step 0 when required personal fields are missing', () => {
    const v = emptyMemberProfileFormValues();
    const r = validateMemberProfileWizardStep(0, v);
    expect(r.ok).toBe(false);
  });

  it('passes step 0 when required personal fields are present', () => {
    const v = {
      ...emptyMemberProfileFormValues(),
      first_name: 'A',
      last_name: 'B',
      email: 'a@example.com',
      date_of_birth: '1990-01-01',
    };
    const r = validateMemberProfileWizardStep(0, v);
    expect(r.ok).toBe(true);
  });

  it('allows empty residential draft in form schema (RHF) while step 1 save stays strict', () => {
    const v = {
      ...emptyMemberProfileFormValues(),
      first_name: 'A',
      last_name: 'B',
      email: 'a@example.com',
      date_of_birth: '1990-01-01',
      residential: { line1: '', locality: '', countryCode: '' },
    };
    expect(memberProfileWizardFormSchema.safeParse(v).success).toBe(true);
    expect(validateMemberProfileWizardStep(1, v).ok).toBe(false);
  });

  it('rejects step 1 when phones are empty', () => {
    const v = {
      ...emptyMemberProfileFormValues(),
      phones: [{ phone_number: '  ', phone_type_id: null }],
      residential: {
        line1: '1 St',
        locality: 'Sydney',
        countryCode: 'AU',
      },
    };
    const r = validateMemberProfileWizardStep(1, v);
    expect(r.ok).toBe(false);
  });

  it('returns nested locality path for residential validation failures', () => {
    const v = {
      ...emptyMemberProfileFormValues(),
      residential: {
        line1: '71 Cobden Street',
        locality: '',
        countryCode: 'AU',
      },
      phones: [{ phone_number: '03 9817 3272', phone_type_id: 1 }],
    };
    const r = validateMemberProfileWizardStep(1, v);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.path === 'residential.locality')).toBe(true);
    }
  });
});

describe('buildMemberProfileFormDefaults', () => {
  it('returns empty model when person is null', () => {
    const d = buildMemberProfileFormDefaults({
      person: null,
      member: null,
      phones: [],
      residential: null,
      postal: null,
    });
    expect(d.first_name).toBe('');
  });
});
