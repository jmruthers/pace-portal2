import { describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { fetchActivityBookingBrowse } from '@/lib/fetchActivityBookingBrowse';
import { fetchActivityWaiverConsentedOfferingIds } from '@/lib/fetchActivityWaiverConsents';
import {
  fetchParticipantApplication,
  fetchParticipantBookings,
} from '@/lib/fetchParticipantBookings';

function chain(responses: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const handler = responses[table];
      if (typeof handler === 'function') return handler();
      return handler ?? { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    }),
  };
}

describe('fetchActivityBookingBrowse (PR19)', () => {
  it('returns shape error when event id is empty', async () => {
    const r = await fetchActivityBookingBrowse({} as never, '  ');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('ACTIVITY_BROWSE_SHAPE');
  });

  it('maps offerings query failure', async () => {
    const client = chain({
      base_activity_offering: {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
      },
    });
    const r = await fetchActivityBookingBrowse(client as never, 'ev-1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('ACTIVITY_BROWSE_QUERY');
  });

  it('returns browse projection with session capacity flags', async () => {
    const eqOffering = vi.fn().mockReturnThis();
    const orderOffering = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'off-1',
          name: 'Kayak',
          description: null,
          booking_open_at: null,
          booking_close_at: null,
          allow_waitlist: true,
          is_active: true,
        },
      ],
      error: null,
    });
    const orderSessions = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'sess-1',
          offering_id: 'off-1',
          session_name: 'Morning',
          start_time: '2026-07-01T09:00:00Z',
          end_time: '2026-07-01T11:00:00Z',
          capacity: 2,
          location_display_name: 'Lake',
        },
      ],
      error: null,
    });
    const eqBookings = vi.fn().mockReturnThis();
    const client = chain({
      base_activity_offering: {
        select: vi.fn(() => ({ eq: eqOffering, order: orderOffering })),
      },
      base_activity_session: {
        select: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), order: orderSessions })),
      },
      base_activity_booking: {
        select: vi.fn(() => ({ eq: eqBookings })),
      },
    });
    eqBookings.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ session_id: 'sess-1', status: 'confirmed' }],
        error: null,
      }),
    });

    const now = new Date('2026-06-15T12:00:00.000Z');
    const r = await fetchActivityBookingBrowse(client as never, 'ev-1', now);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toHaveLength(1);
      expect(r.data[0]?.sessions[0]?.confirmedCount).toBe(1);
      expect(r.data[0]?.bookingWindowOpen).toBe(true);
    }
  });
});

describe('fetchActivityWaiverConsentedOfferingIds (PR19)', () => {
  it('returns shape error when ids missing', async () => {
    const r = await fetchActivityWaiverConsentedOfferingIds({} as never, {
      applicationId: '',
      personId: 'p1',
      eventId: 'ev-1',
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('ACTIVITY_CONSENT_SHAPE');
  });

  it('collects offering ids from consent rows', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: [
            {
              booking_id: 'b1',
              base_activity_booking: {
                session_id: 's1',
                base_activity_session: { offering_id: 'off-1' },
              },
            },
          ],
          error: null,
        }),
      })),
    };
    const r = await fetchActivityWaiverConsentedOfferingIds(client as never, {
      applicationId: 'app-1',
      personId: 'p1',
      eventId: 'ev-1',
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data.has('off-1')).toBe(true);
  });
});

describe('fetchParticipantBookings (PR19)', () => {
  it('returns shape error when application id empty', async () => {
    const r = await fetchParticipantBookings({} as never, '');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('ACTIVITY_BOOKINGS_SHAPE');
  });

  it('maps booking rows with cancellable flag', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'book-1',
              session_id: 'sess-1',
              status: 'confirmed',
              booked_at: '2026-06-01T00:00:00Z',
              cancelled_at: null,
              base_activity_session: {
                session_name: 'Morning',
                start_time: '2026-12-01T09:00:00Z',
                end_time: '2026-12-01T11:00:00Z',
                base_activity_offering: { name: 'Kayak' },
              },
            },
          ],
          error: null,
        }),
      })),
    };
    const now = new Date('2026-06-15T12:00:00.000Z');
    const r = await fetchParticipantBookings(client as never, 'app-1', now);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data[0]?.offering_name).toBe('Kayak');
      expect(r.data[0]?.cancellable).toBe(true);
    }
  });
});

describe('fetchParticipantApplication (PR19)', () => {
  it('returns null when no application row', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };
    const r = await fetchParticipantApplication(client as never, 'p1', 'ev-1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBeNull();
  });
});
