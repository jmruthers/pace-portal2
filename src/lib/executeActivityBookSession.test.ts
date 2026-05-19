import { describe, expect, it, vi, beforeEach } from 'vitest';
import { err, ok } from '@solvera/pace-core/types';
import { executeActivityBookSession } from '@/lib/executeActivityBookSession';
import type { OfferingBrowseItem, ParticipantApplicationContext } from '@/lib/activityBookingTypes';

const createActivityBookingMock = vi.hoisted(() => vi.fn());
const cancelActivityBookingMock = vi.hoisted(() => vi.fn());
const persistActivityBookingConsentMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/activityBookingRpc', () => ({
  createActivityBooking: (...args: unknown[]) => createActivityBookingMock(...args),
  cancelActivityBooking: (...args: unknown[]) => cancelActivityBookingMock(...args),
}));

vi.mock('@/lib/persistActivityBookingConsent', () => ({
  persistActivityBookingConsent: (...args: unknown[]) => persistActivityBookingConsentMock(...args),
}));

const client = {} as import('@supabase/supabase-js').SupabaseClient<
  import('@/types/pace-database').Database
>;

const application: ParticipantApplicationContext = {
  id: 'app-1',
  event_id: 'ev-1',
  organisation_id: 'org-1',
  person_id: 'person-1',
  status: 'approved',
};

const offerings: OfferingBrowseItem[] = [
  {
    id: 'off-1',
    name: 'Kayak',
    description: 'Waiver text',
    location_display: null,
    booking_open_at: null,
    booking_close_at: null,
    bookingWindowOpen: true,
    consentRequired: true,
    consentText: 'Waiver text',
    sessions: [
      {
        id: 'sess-1',
        session_name: 'Morning',
        start_time: '2026-12-01T10:00:00.000Z',
        end_time: '2026-12-01T12:00:00.000Z',
        location_display: null,
        capacity: 10,
        allow_waitlist: false,
        capacityFull: false,
        waitlistOpen: false,
        confirmedCount: 0,
      },
    ],
  },
];

const baseInput = {
  client,
  eventId: 'ev-1',
  application,
  sessionId: 'sess-1',
  consentAcknowledged: true,
  offerings,
  bookings: [],
  consentedByPersonId: 'person-1',
  createdByUserId: 'user-1',
};

describe('executeActivityBookSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createActivityBookingMock.mockResolvedValue(ok({ booking_id: 'book-new', status: 'confirmed' }));
    persistActivityBookingConsentMock.mockResolvedValue(ok(undefined));
    cancelActivityBookingMock.mockResolvedValue(ok(undefined));
  });

  it('cancels booking when consent persist fails after create', async () => {
    persistActivityBookingConsentMock.mockResolvedValue(
      err({ code: 'ACTIVITY_CONSENT_INSERT', message: 'insert failed' })
    );

    const result = await executeActivityBookSession(baseInput);

    expect(!result.ok && result.error.code === 'ACTIVITY_BOOKING_CONSENT_PERSIST').toBe(true);
    expect(cancelActivityBookingMock).toHaveBeenCalledWith(client, {
      bookingId: 'book-new',
      cancelledBy: 'user-1',
    });
  });

  it('returns success when create and consent persist succeed', async () => {
    const result = await executeActivityBookSession(baseInput);
    expect(result.ok).toBe(true);
    expect(persistActivityBookingConsentMock).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ applicationId: 'app-1', bookingId: 'book-new' })
    );
    expect(cancelActivityBookingMock).not.toHaveBeenCalled();
  });
});
