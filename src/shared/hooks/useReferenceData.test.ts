import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
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
    const result = await fetchReferenceDataBundle(client);
    expect(isOk(result)).toBe(true);
    expect(from).toHaveBeenCalledTimes(4);
    expect(from.mock.calls.map((c) => c[0])).toEqual([
      'core_phone_type',
      'core_membership_type',
      'core_gender_type',
      'core_pronoun_type',
    ]);
    if (!isOk(result)) throw new Error('expected ok');
    expect(result.data.phoneTypes.length).toBe(1);
    expect(result.data.membershipTypes.length).toBe(1);
  });
});
