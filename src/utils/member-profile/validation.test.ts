import { describe, expect, it } from 'vitest';
import { memberProfileSchema } from '@/utils/member-profile/validation';

const base = {
  first_name: 'A',
  last_name: 'B',
  middle_name: null,
  preferred_name: null,
  email: 'a@example.com',
  date_of_birth: '2000-01-01',
  gender_id: 1,
  pronoun_id: 1,
  residential: {
    line1: '1 Test St',
    locality: 'Sydney',
    countryCode: 'AU',
    placeId: 'place-1',
  },
  postal_same_as_residential: true,
  postal: null,
  membership_type_id: 1,
  membership_number: 'M1',
  membership_status: 'Active' as const,
  phones: [{ phone_number: '0400000000', phone_type_id: 1 }],
};

describe('memberProfileSchema', () => {
  it('accepts valid payload', () => {
    const r = memberProfileSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejects missing gender', () => {
    const r = memberProfileSchema.safeParse({ ...base, gender_id: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects missing pronoun selection', () => {
    const r = memberProfileSchema.safeParse({ ...base, pronoun_id: 0 });
    expect(r.success).toBe(false);
  });

  it('requires postal when not same as residential', () => {
    const r = memberProfileSchema.safeParse({
      ...base,
      postal_same_as_residential: false,
      postal: null,
    });
    expect(r.success).toBe(false);
  });

  it('reports nested postal issues when postal section is invalid', () => {
    const r = memberProfileSchema.safeParse({
      ...base,
      postal_same_as_residential: false,
      postal: {
        line1: '',
        locality: 'Sydney',
        countryCode: 'AU',
      },
    });
    expect(r.success).toBe(false);
  });
});
