import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { fetchApplicationStatusByEventIds } from '@/shared/lib/fetchApplicationStatusByEventIds';

describe('fetchApplicationStatusByEventIds', () => {
  it('returns empty record when event id list is empty', async () => {
    const r = await fetchApplicationStatusByEventIds(
      { from: vi.fn() } as never,
      'p1',
      [],
      { code: 'X', fallbackMessage: 'fail' }
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toEqual({});
  });

  it('maps rows to event_id keyed statuses', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { event_id: 'ev1', status: 'draft' },
          { event_id: 'ev2', status: 'approved' },
        ],
        error: null,
      }),
    }));
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(client, 'p1', ['ev1', 'ev2'], {
      code: 'Q',
      fallbackMessage: 'fallback',
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ ev1: 'draft', ev2: 'approved' });
    }
  });

  it('returns err with caller code when query errors', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'rls' } }),
    }));
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(client, 'p1', ['ev1'], {
      code: 'ENHANCED_LANDING_QUERY',
      fallbackMessage: 'Could not load dashboard data.',
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) {
      expect(r.error.code).toBe('ENHANCED_LANDING_QUERY');
      expect(r.error.message).toMatch(/rls/);
    }
  });
});
