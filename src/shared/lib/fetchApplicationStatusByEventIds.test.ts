import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { fetchApplicationStatusByEventIds } from '@/shared/lib/fetchApplicationStatusByEventIds';

function registrationFormsChain(formRows: Array<{ id: string; event_id: string }>) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn((column: string) => {
      if (column === 'status') {
        return Promise.resolve({ data: formRows, error: null });
      }
      return chain;
    }),
  };
  return chain;
}

function formResponsesChain(options: {
  submittedRows?: Array<{ form_id: string }>;
  draftRows?: Array<{ form_id: string }>;
}) {
  let statusFilter: string | null = null;
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: string) => {
      if (column === 'status') {
        statusFilter = value;
      }
      return chain;
    }),
    is: vi.fn(() => chain),
    in: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data:
          statusFilter === 'submitted'
            ? (options.submittedRows ?? [])
            : (options.draftRows ?? []),
        error: null,
      })
    ),
  };
  return chain;
}

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

  it('treats draft core_form_responses as in-progress when no base_application exists', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'core_forms') {
        return registrationFormsChain([{ id: 'form-1', event_id: 'ev1' }]);
      }
      if (table === 'core_form_responses') {
        return formResponsesChain({
          draftRows: [{ form_id: 'form-1' }],
        });
      }
      return {};
    });
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(
      client,
      'p1',
      ['ev1'],
      { code: 'Q', fallbackMessage: 'fallback' },
      'user-1'
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ ev1: 'draft' });
    }
  });

  it('treats submitted core_form_responses as submitted when no base_application exists', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'core_forms') {
        return registrationFormsChain([{ id: 'form-1', event_id: 'ev1' }]);
      }
      if (table === 'core_form_responses') {
        return formResponsesChain({
          submittedRows: [{ form_id: 'form-1' }],
        });
      }
      return {};
    });
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(
      client,
      'p1',
      ['ev1'],
      { code: 'Q', fallbackMessage: 'fallback' },
      'user-1'
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ ev1: 'submitted' });
    }
  });

  it('prefers submitted form responses over orphan draft rows for the same event', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'core_forms') {
        return registrationFormsChain([{ id: 'form-1', event_id: 'ev1' }]);
      }
      if (table === 'core_form_responses') {
        return formResponsesChain({
          submittedRows: [{ form_id: 'form-1' }],
          draftRows: [{ form_id: 'form-1' }],
        });
      }
      return {};
    });
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(
      client,
      'p1',
      ['ev1'],
      { code: 'Q', fallbackMessage: 'fallback' },
      'user-1'
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ ev1: 'submitted' });
    }
  });

  it('prefers base_application status over draft form responses', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ event_id: 'ev1', status: 'approved' }],
            error: null,
          }),
        };
      }
      if (table === 'core_forms') {
        return registrationFormsChain([{ id: 'form-1', event_id: 'ev1' }]);
      }
      if (table === 'core_form_responses') {
        return formResponsesChain({
          draftRows: [{ form_id: 'form-1' }],
        });
      }
      return {};
    });
    const client = { from } as never;

    const r = await fetchApplicationStatusByEventIds(
      client,
      'p1',
      ['ev1'],
      { code: 'Q', fallbackMessage: 'fallback' },
      'user-1'
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ ev1: 'approved' });
    }
  });
});
