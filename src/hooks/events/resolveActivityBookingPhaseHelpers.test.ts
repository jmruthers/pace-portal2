import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@solvera/pace-core/types';
import {
  accessDeniedOrErrorPhase,
  buildActivityBookingPhaseBase,
  phaseResult,
  resolveApplicationPhase,
  resolveBrowseBookingsPhase,
  resolveEventPhase,
  resolvePersonPhase,
  resolveRoutingAndAuthPhase,
} from '@/hooks/events/resolveActivityBookingPhaseHelpers';
import type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

function noop() {}

function minimalMutations(): ResolveActivityBookingPhaseInput['mutations'] {
  return {
    refetchAll: vi.fn(),
    validateSession: vi.fn(),
    bookSession: vi.fn(),
    cancelBooking: vi.fn(),
    bookPending: false,
    cancelPending: false,
    lastActionError: null,
    clearLastActionError: noop,
  };
}

function minimalInput(
  overrides: Partial<ResolveActivityBookingPhaseInput> = {}
): ResolveActivityBookingPhaseInput {
  return {
    routing: { reserved: false, slug: 'summer-camp' },
    auth: { client: {}, userId: 'u1', organisationId: 'org-1', orgIdsLength: 1 },
    mutations: minimalMutations(),
    event: { loading: false, data: undefined, row: { event_id: 'ev-1' } as never },
    person: { loading: false, data: ok({ person: { id: 'p1' } }), personId: 'p1' },
    application: {
      loading: false,
      data: ok({ id: 'app-1' } as never),
      row: { id: 'app-1' } as never,
    },
    browse: { loading: false, data: ok([]), offerings: [] },
    bookings: { loading: false, data: ok([]), bookings: [] },
    waiver: { loading: false, data: ok(new Set()) },
    ...overrides,
  };
}

describe('resolveActivityBookingPhaseHelpers (PR19 phase machine)', () => {
  it('buildActivityBookingPhaseBase wires mutation callbacks', () => {
    const input = minimalInput();
    const base = buildActivityBookingPhaseBase(input);
    expect(base.refetch).toBe(input.mutations.refetchAll);
    expect(base.reservedSlug).toBe(false);
  });

  it('accessDeniedOrErrorPhase returns access_denied for booking denial marker', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    const r = accessDeniedOrErrorPhase(
      base,
      'base_booking_access_denied',
      'You cannot book activities for this event.'
    );
    expect(r?.phase).toBe('access_denied');
    expect(r?.errorMessage).toMatch(/cannot book/i);
  });

  it('accessDeniedOrErrorPhase returns error for non-empty generic message', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    const r = accessDeniedOrErrorPhase(base, 'Server error', 'denied');
    expect(r?.phase).toBe('error');
    expect(r?.errorMessage).toBe('Server error');
  });

  it('resolveRoutingAndAuthPhase handles reserved slug and missing auth', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    expect(
      resolveRoutingAndAuthPhase(
        minimalInput({ routing: { reserved: true, slug: 'application' } }),
        base
      )?.phase
    ).toBe('reserved');
    expect(
      resolveRoutingAndAuthPhase(minimalInput({ routing: { reserved: false, slug: '' } }), base)?.phase
    ).toBe('not_found');
    expect(
      resolveRoutingAndAuthPhase(
        minimalInput({ auth: { client: null, userId: null, organisationId: null, orgIdsLength: 0 } }),
        base
      )?.phase
    ).toBe('loading_context');
  });

  it('resolveEventPhase handles loading, not found, and query error', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    expect(resolveEventPhase(minimalInput({ event: { loading: true, data: undefined, row: undefined } }), base)?.phase).toBe(
      'loading'
    );
    expect(
      resolveEventPhase(
        minimalInput({
          event: {
            loading: false,
            data: err({ code: 'EVENT_NOT_FOUND', message: 'missing' }),
            row: undefined,
          },
        }),
        base
      )?.phase
    ).toBe('not_found');
    expect(
      resolveEventPhase(
        minimalInput({
          event: {
            loading: false,
            data: err({ code: 'EVENT_QUERY', message: 'boom' }),
            row: undefined,
          },
        }),
        base
      )?.errorMessage
    ).toBe('boom');
  });

  it('resolvePersonPhase maps missing profile to needs_profile', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    expect(
      resolvePersonPhase(
        minimalInput({
          person: {
            loading: false,
            data: err({ code: NO_PERSON_PROFILE_ERROR_CODE, message: 'no profile' }),
            personId: null,
          },
        }),
        base
      )?.phase
    ).toBe('needs_profile');
    expect(
      resolvePersonPhase(
        minimalInput({ person: { loading: false, data: ok(null), personId: null } }),
        base
      )?.phase
    ).toBe('needs_profile');
  });

  it('resolveApplicationPhase returns no_application when row missing', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    expect(
      resolveApplicationPhase(
        minimalInput({
          application: { loading: false, data: ok(null), row: undefined },
        }),
        base
      )?.phase
    ).toBe('no_application');
  });

  it('resolveBrowseBookingsPhase surfaces browse access denial', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    const r = resolveBrowseBookingsPhase(
      minimalInput({
        browse: {
          loading: false,
          data: err({ code: 'ACTIVITY_BROWSE_QUERY', message: 'base_booking_access_denied' }),
          offerings: [],
        },
      }),
      base
    );
    expect(r?.phase).toBe('access_denied');
  });

  it('phaseResult merges overrides onto base', () => {
    const base = buildActivityBookingPhaseBase(minimalInput());
    const r = phaseResult(base, 'ready', { data: { offerings: [], bookings: [] } as never });
    expect(r.phase).toBe('ready');
    expect(r.data).toBeDefined();
  });
});
