import { describe, expect, it, vi } from 'vitest';
import { fetchActiveCakeDietTypes, findDietTypeById } from '@/hooks/medical-profile/cakeDietTypes';

describe('findDietTypeById', () => {
  const rows = [
    {
      diettype_id: '14',
      diettype_code: 'X',
      diettype_name: 'Fourteen',
      diettype_description: null,
    },
  ];

  it('matches UUID last segment decimal to short numeric id', () => {
    const id = '00000000-0000-0000-0000-000000000014';
    expect(findDietTypeById(rows, id)?.diettype_name).toBe('Fourteen');
  });

  it('matches exact id string', () => {
    expect(findDietTypeById(rows, '14')?.diettype_name).toBe('Fourteen');
  });

  it('returns undefined when rows empty', () => {
    expect(findDietTypeById([], '14')).toBeUndefined();
  });
});

describe('fetchActiveCakeDietTypes', () => {
  it('returns ok with rows when query succeeds', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              diettype_id: '1',
              diettype_code: 'ST',
              diettype_name: 'Standard',
              diettype_description: null,
            },
          ],
          error: null,
        }),
      })),
    };

    const r = await fetchActiveCakeDietTypes(client as never);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(1);
    }
  });

  it('returns err when supabase reports an error', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'boom' },
        }),
      })),
    };

    const r = await fetchActiveCakeDietTypes(client as never);
    expect(r.ok).toBe(false);
  });
});
