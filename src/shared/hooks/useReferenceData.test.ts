import { describe, expect, it, vi } from 'vitest';
import { fetchReferenceDataBundle } from '@/shared/hooks/useReferenceData';

describe('fetchReferenceDataBundle', () => {
  it('loads four tables in parallel', async () => {
    const from = vi.fn((table: string) => ({
      select: vi.fn(() =>
        Promise.resolve({
          data: [{ id: 1, _table: table }],
          error: null,
        })
      ),
    }));
    const client = { from } as never;
    const bundle = await fetchReferenceDataBundle(client);
    expect(from).toHaveBeenCalledTimes(4);
    expect(from.mock.calls.map((c) => c[0])).toEqual([
      'core_phone_type',
      'core_membership_type',
      'core_gender_type',
      'core_pronoun_type',
    ]);
    expect(bundle.phoneTypes.length).toBe(1);
    expect(bundle.membershipTypes.length).toBe(1);
  });
});
