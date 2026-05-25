import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { fetchRegistrationTypeIdForApplicant } from '@/lib/resolveRegistrationTypeForApplicant';

function makeClient(handlers: Record<string, () => unknown>) {
  return {
    from: (table: string) => handlers[table]?.() ?? {},
  } as never;
}

describe('fetchRegistrationTypeIdForApplicant', () => {
  it('prefers an eligible non-default registration type over default youth', async () => {
    const client = makeClient({
      base_form_registration_type: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              registration_type_id: 'rt-youth',
              is_default: true,
              sort_order: 0,
            },
            {
              registration_type_id: 'rt-adult',
              is_default: false,
              sort_order: 1,
            },
          ],
          error: null,
        }),
      }),
      core_person: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { date_of_birth: '1981-12-12' },
          error: null,
        }),
      }),
      core_member: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { membership_type_id: null },
          error: null,
        }),
      }),
      base_registration_type_eligibility: () => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              registration_type_id: 'rt-youth',
              rule_type: 'membership_type',
              value: '5',
            },
          ],
          error: null,
        }),
      }),
    });

    const r = await fetchRegistrationTypeIdForApplicant(client, 'form-1', 'person-1', 'org-1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toBe('rt-adult');
    }
  });
});
