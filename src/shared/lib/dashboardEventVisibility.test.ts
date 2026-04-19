import { describe, expect, it } from 'vitest';
import {
  distinctEligibleEventIds,
  isDashboardEligibleForm,
} from '@/shared/lib/dashboardEventVisibility';

const now = new Date('2025-06-15T12:00:00.000Z');

describe('isDashboardEligibleForm', () => {
  it('requires published status', () => {
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'draft',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(false);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'closed',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(false);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(true);
  });

  it('rejects missing event_id', () => {
    expect(
      isDashboardEligibleForm(
        {
          event_id: null,
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(false);
  });

  it('rejects is_active false only', () => {
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: false,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(false);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: null,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(true);
  });

  it('applies opens_at and closes_at window', () => {
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: '2025-06-16T12:00:00.000Z',
          closes_at: null,
        },
        now
      )
    ).toBe(false);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: '2025-06-14T12:00:00.000Z',
          closes_at: '2025-06-16T12:00:00.000Z',
        },
        now
      )
    ).toBe(true);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: '2025-06-14T12:00:00.000Z',
        },
        now
      )
    ).toBe(false);
    expect(
      isDashboardEligibleForm(
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: '2025-06-14T12:00:00.000Z',
          closes_at: null,
        },
        now
      )
    ).toBe(true);
  });

  it('treats empty event_id string as missing', () => {
    expect(
      isDashboardEligibleForm(
        {
          event_id: '   ',
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        now
      )
    ).toBe(false);
  });
});

describe('distinctEligibleEventIds', () => {
  it('dedupes event ids', () => {
    const ids = distinctEligibleEventIds(
      [
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
        {
          event_id: 'e1',
          status: 'published',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
      ],
      now
    );
    expect(ids).toEqual(['e1']);
  });

  it('drops ineligible forms', () => {
    expect(
      distinctEligibleEventIds(
        [
          {
            event_id: 'e1',
            status: 'published',
            is_active: true,
            opens_at: null,
            closes_at: null,
          },
          {
            event_id: 'e2',
            status: 'draft',
            is_active: true,
            opens_at: null,
            closes_at: null,
          },
        ],
        now
      )
    ).toEqual(['e1']);
  });
});
