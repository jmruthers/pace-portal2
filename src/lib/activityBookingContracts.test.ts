import { describe, expect, it } from 'vitest';
import {
  computeBookingWindowOpen,
  computeCapacityFull,
  computeCancellable,
  computeDuplicateBooking,
  computeSessionConflict,
  computeWaitlistOpen,
  mapActivityBookingRpcMessage,
  primaryBookingBlockMessage,
} from '@/lib/activityBookingContracts';
import { validateActivityBooking as validateFromModule } from '@/lib/validateActivityBooking';

describe('activityBookingContracts', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  describe('computeBookingWindowOpen', () => {
    it('returns true when both window bounds are null', () => {
      expect(computeBookingWindowOpen(null, null, now)).toBe(true);
    });

    it('returns false when open is in the future and close is null', () => {
      expect(
        computeBookingWindowOpen('2026-07-01T00:00:00.000Z', null, now)
      ).toBe(false);
    });

    it('returns true when only close is in the future', () => {
      expect(
        computeBookingWindowOpen(null, '2026-12-31T23:59:59.000Z', now)
      ).toBe(true);
    });

    it('returns true when now is inside both bounds', () => {
      expect(
        computeBookingWindowOpen(
          '2026-06-01T00:00:00.000Z',
          '2026-06-30T23:59:59.000Z',
          now
        )
      ).toBe(true);
    });

    it('returns false when now is after close', () => {
      expect(
        computeBookingWindowOpen(
          '2026-06-01T00:00:00.000Z',
          '2026-06-10T00:00:00.000Z',
          now
        )
      ).toBe(false);
    });
  });

  describe('computeCapacityFull', () => {
    it('is true when confirmed count meets capacity', () => {
      expect(computeCapacityFull(10, 10)).toBe(true);
    });

    it('is false when confirmed count is below capacity', () => {
      expect(computeCapacityFull(9, 10)).toBe(false);
    });
  });

  describe('computeWaitlistOpen', () => {
    it('is true only when full and waitlist allowed', () => {
      expect(computeWaitlistOpen(true, true)).toBe(true);
      expect(computeWaitlistOpen(true, false)).toBe(false);
      expect(computeWaitlistOpen(false, true)).toBe(false);
    });
  });

  describe('computeDuplicateBooking', () => {
    it('detects confirmed and waitlisted duplicates', () => {
      const bookings = [
        { session_id: 's1', status: 'confirmed' },
        { session_id: 's2', status: 'waitlisted' },
      ];
      expect(computeDuplicateBooking('s1', bookings)).toBe(true);
      expect(computeDuplicateBooking('s2', bookings)).toBe(true);
      expect(computeDuplicateBooking('s3', bookings)).toBe(false);
    });

    it('ignores cancelled bookings', () => {
      expect(
        computeDuplicateBooking('s1', [{ session_id: 's1', status: 'cancelled' }])
      ).toBe(false);
    });
  });

  describe('computeSessionConflict', () => {
    it('detects overlapping sessions', () => {
      const { sessionConflict, conflictingSession } = computeSessionConflict(
        'target',
        '2026-06-15T10:00:00.000Z',
        '2026-06-15T12:00:00.000Z',
        [
          {
            session_id: 'other',
            status: 'confirmed',
            start_time: '2026-06-15T11:00:00.000Z',
            end_time: '2026-06-15T13:00:00.000Z',
            session_name: 'Overlap',
          },
        ]
      );
      expect(sessionConflict).toBe(true);
      expect(conflictingSession?.session_id).toBe('other');
    });

    it('does not flag adjacent non-overlapping sessions', () => {
      const { sessionConflict } = computeSessionConflict(
        'target',
        '2026-06-15T10:00:00.000Z',
        '2026-06-15T11:00:00.000Z',
        [
          {
            session_id: 'other',
            status: 'confirmed',
            start_time: '2026-06-15T11:00:00.000Z',
            end_time: '2026-06-15T12:00:00.000Z',
            session_name: 'Next',
          },
        ]
      );
      expect(sessionConflict).toBe(false);
    });
  });

  describe('computeCancellable', () => {
    it('is true for confirmed future sessions', () => {
      expect(
        computeCancellable('confirmed', '2026-12-01T10:00:00.000Z', now)
      ).toBe(true);
    });

    it('is false for past sessions, waitlisted, and cancelled', () => {
      expect(
        computeCancellable('confirmed', '2026-01-01T10:00:00.000Z', now)
      ).toBe(false);
      expect(
        computeCancellable('waitlisted', '2026-12-01T10:00:00.000Z', now)
      ).toBe(false);
      expect(
        computeCancellable('cancelled', '2026-12-01T10:00:00.000Z', now)
      ).toBe(false);
    });
  });

  describe('mapActivityBookingRpcMessage', () => {
    it('maps known base_booking markers', () => {
      expect(mapActivityBookingRpcMessage('base_booking_window_closed').code).toBe(
        'ACTIVITY_BOOKING_WINDOW_CLOSED'
      );
      expect(mapActivityBookingRpcMessage('base_booking_duplicate').code).toBe(
        'ACTIVITY_BOOKING_DUPLICATE'
      );
    });
  });

  describe('primaryBookingBlockMessage', () => {
    it('prioritises booking window over other failures', () => {
      const msg = primaryBookingBlockMessage({
        bookingWindowOpen: false,
        capacityFull: true,
        waitlistOpen: false,
        duplicateBooking: true,
        sessionConflict: false,
        conflictingSession: null,
        eligibilityDenied: true,
        consentRequired: false,
        consentText: null,
        canBook: false,
      });
      expect(msg).toMatch(/not open/i);
    });

    it('surfaces consent acknowledgement message when consent required', () => {
      const msg = primaryBookingBlockMessage({
        bookingWindowOpen: true,
        capacityFull: false,
        waitlistOpen: false,
        duplicateBooking: false,
        sessionConflict: false,
        conflictingSession: null,
        eligibilityDenied: false,
        consentRequired: true,
        consentText: 'Waiver',
        canBook: true,
      });
      expect(msg).toMatch(/consent/i);
    });
  });
});

describe('validateActivityBooking module', () => {
  const application = {
    id: 'app-1',
    event_id: 'ev-1',
    organisation_id: 'org-1',
    person_id: 'person-1',
    status: 'approved',
  };

  const offerings = [
    {
      id: 'off-1',
      name: 'Kayak',
      description: null,
      location_display: null,
      booking_open_at: null,
      booking_close_at: null,
      bookingWindowOpen: true,
      consentRequired: false,
      consentText: null,
      sessions: [
        {
          id: 'sess-1',
          session_name: 'Morning',
          start_time: '2026-07-01T09:00:00.000Z',
          end_time: '2026-07-01T11:00:00.000Z',
          location_display: 'Lake',
          capacity: 2,
          allow_waitlist: true,
          capacityFull: false,
          waitlistOpen: false,
          confirmedCount: 0,
        },
      ],
    },
  ];

  it('returns canBook when all server-evaluable checks pass', () => {
    const result = validateFromModule({
      application,
      sessionId: 'sess-1',
      offerings,
      bookings: [],
    });
    expect(result.canBook).toBe(true);
    expect(result.eligibilityDenied).toBe(false);
  });

  it('denies when application is not approved', () => {
    const result = validateFromModule({
      application: { ...application, status: 'submitted' },
      sessionId: 'sess-1',
      offerings,
      bookings: [],
    });
    expect(result.eligibilityDenied).toBe(true);
    expect(result.canBook).toBe(false);
  });

  it('surfaces consentRequired from offering projection', () => {
    const withConsent = [
      {
        ...offerings[0],
        description: 'I accept the activity waiver.',
        consentRequired: true,
        consentText: 'I accept the activity waiver.',
      },
    ];
    const result = validateFromModule({
      application,
      sessionId: 'sess-1',
      offerings: withConsent,
      bookings: [],
    });
    expect(result.consentRequired).toBe(true);
    expect(result.consentText).toBe('I accept the activity waiver.');
    expect(result.canBook).toBe(true);
  });

  it('blocks capacity when full and waitlist closed', () => {
    const fullSession = {
      ...offerings[0].sessions[0],
      capacityFull: true,
      waitlistOpen: false,
      allow_waitlist: false,
    };
    const result = validateFromModule({
      application,
      sessionId: 'sess-1',
      offerings: [{ ...offerings[0], sessions: [fullSession] }],
      bookings: [],
    });
    expect(result.capacityFull).toBe(true);
    expect(result.waitlistOpen).toBe(false);
    expect(result.canBook).toBe(false);
  });

  it('allows waitlist when capacity full and waitlist open', () => {
    const waitlistSession = {
      ...offerings[0].sessions[0],
      capacityFull: true,
      waitlistOpen: true,
      allow_waitlist: true,
    };
    const result = validateFromModule({
      application,
      sessionId: 'sess-1',
      offerings: [{ ...offerings[0], sessions: [waitlistSession] }],
      bookings: [],
    });
    expect(result.waitlistOpen).toBe(true);
    expect(result.canBook).toBe(true);
  });

  it('blocks when session conflicts with an existing booking', () => {
    const result = validateFromModule({
      application,
      sessionId: 'sess-2',
      offerings: [
        {
          ...offerings[0],
          sessions: [
            offerings[0].sessions[0],
            {
              id: 'sess-2',
              session_name: 'Afternoon',
              start_time: '2026-07-01T09:30:00.000Z',
              end_time: '2026-07-01T11:30:00.000Z',
              location_display: null,
              capacity: 2,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ],
      bookings: [
        {
          id: 'b1',
          session_id: 'sess-1',
          session_name: 'Morning',
          start_time: '2026-07-01T09:00:00.000Z',
          end_time: '2026-07-01T11:00:00.000Z',
          offering_name: 'Kayak',
          status: 'confirmed',
          booked_at: '2026-06-01T00:00:00.000Z',
          cancelled_at: null,
          cancellable: true,
          onWaitlist: false,
        },
      ],
    });
    expect(result.sessionConflict).toBe(true);
    expect(result.canBook).toBe(false);
  });
});
