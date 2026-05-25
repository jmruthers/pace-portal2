import { describe, expect, it } from 'vitest';
import {
  buildFormResponseOpenByEventId,
  distinctListedEventIds,
  isDashboardListedForm,
  isFormResponseWindowOpen,
} from '@/shared/lib/dashboardEventVisibility';

const now = new Date('2025-06-15T12:00:00.000Z');

describe('isDashboardListedForm', () => {
  it('requires published status', () => {
    expect(
      isDashboardListedForm({
        event_id: 'e1',
        status: 'draft',
        is_active: true,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(false);
    expect(
      isDashboardListedForm({
        event_id: 'e1',
        status: 'published',
        is_active: true,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(true);
  });

  it('rejects missing event_id and is_active false', () => {
    expect(
      isDashboardListedForm({
        event_id: null,
        status: 'published',
        is_active: true,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(false);
    expect(
      isDashboardListedForm({
        event_id: 'e1',
        status: 'published',
        is_active: false,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(false);
  });

  it('lists events even when opens_at is in the future', () => {
    expect(
      isDashboardListedForm({
        event_id: 'e1',
        status: 'published',
        is_active: true,
        opens_at: '2025-06-16T12:00:00.000Z',
        closes_at: null,
      })
    ).toBe(true);
  });
});

describe('isFormResponseWindowOpen', () => {
  it('applies opens_at and closes_at window', () => {
    expect(
      isFormResponseWindowOpen(
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
      isFormResponseWindowOpen(
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
      isFormResponseWindowOpen(
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
  });
});

describe('distinctListedEventIds', () => {
  it('dedupes event ids and ignores draft forms', () => {
    expect(
      distinctListedEventIds([
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
          opens_at: '2099-01-01T00:00:00.000Z',
          closes_at: null,
        },
        {
          event_id: 'e2',
          status: 'draft',
          is_active: true,
          opens_at: null,
          closes_at: null,
        },
      ])
    ).toEqual(['e1']);
  });
});

describe('buildFormResponseOpenByEventId', () => {
  it('marks events open only when a listed form is in window', () => {
    expect(
      buildFormResponseOpenByEventId(
        [
          {
            event_id: 'e1',
            status: 'published',
            is_active: true,
            opens_at: '2099-01-01T00:00:00.000Z',
            closes_at: null,
          },
          {
            event_id: 'e2',
            status: 'published',
            is_active: true,
            opens_at: null,
            closes_at: null,
          },
        ],
        now
      )
    ).toEqual({ e2: true });
  });
});
