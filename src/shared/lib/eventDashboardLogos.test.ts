import { describe, expect, it } from 'vitest';
import {
  isEventLogoRow,
  pickLatestEventLogoByEventId,
  type EventLogoRefRow,
} from '@/shared/lib/eventDashboardLogos';

describe('eventDashboardLogos', () => {
  it('isEventLogoRow matches category and path segment', () => {
    expect(
      isEventLogoRow({
        file_path: 'x/event_logo/y.png',
        file_metadata: {},
      })
    ).toBe(true);
    expect(
      isEventLogoRow({
        file_path: 'a/b.png',
        file_metadata: { category: 'event_logo' },
      })
    ).toBe(true);
    expect(
      isEventLogoRow({
        file_path: 'a/b.png',
        file_metadata: { category: 'event_logos' },
      })
    ).toBe(true);
    expect(
      isEventLogoRow({
        file_path: 'x/event_logos/y.png',
        file_metadata: {},
      })
    ).toBe(true);
    expect(
      isEventLogoRow({
        file_path: 'a/b.png',
        file_metadata: { category: 'other' },
      })
    ).toBe(false);
  });

  it('pickLatestEventLogoByEventId keeps newest per event', () => {
    const refs: EventLogoRefRow[] = [
      {
        record_id: 'ev1',
        file_path: 'p1',
        is_public: true,
        file_metadata: { category: 'event_logo' },
        created_at: '2020-01-01T00:00:00Z',
      },
      {
        record_id: 'ev1',
        file_path: 'p2',
        is_public: true,
        file_metadata: { category: 'event_logo' },
        created_at: '2021-01-01T00:00:00Z',
      },
    ];
    const m = pickLatestEventLogoByEventId(refs);
    expect(m.get('ev1')?.file_path).toBe('p2');
  });
});
