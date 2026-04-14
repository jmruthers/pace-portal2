import { describe, expect, it } from 'vitest';
import { computeProfileProgress } from '@/shared/lib/profileProgress';

describe('computeProfileProgress', () => {
  it('counts filled tracked fields', () => {
    const r = computeProfileProgress({
      person: {
        first_name: 'A',
        last_name: 'B',
        email: 'a@b.c',
        date_of_birth: '2000-01-01',
        preferred_name: null,
      },
      member: {
        membership_type_id: 1,
        gender_id: 2,
        pronoun_id: 3,
        membership_number: 'M1',
      },
    });
    expect(r.totalFields).toBe(9);
    expect(r.filledFields).toBe(8);
    expect(r.completionRatio).toBeGreaterThan(0.8);
  });
});
