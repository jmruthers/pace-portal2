import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useActivityBooking } from '@/hooks/events/useActivityBooking';
import { err, ok } from '@solvera/pace-core/types';

const lookupEventRowBySlugMock = vi.hoisted(() => vi.fn());
const fetchCurrentPersonMemberMock = vi.hoisted(() => vi.fn());
const fetchParticipantApplicationMock = vi.hoisted(() => vi.fn());
const fetchActivityBookingBrowseMock = vi.hoisted(() => vi.fn());
const fetchParticipantBookingsMock = vi.hoisted(() => vi.fn());
const createActivityBookingMock = vi.hoisted(() => vi.fn());
const cancelActivityBookingMock = vi.hoisted(() => vi.fn());
const fetchActivityWaiverConsentedOfferingIdsMock = vi.hoisted(() => vi.fn());
const persistActivityBookingConsentMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/events/useEventHub', () => ({
  lookupEventRowBySlug: (...args: unknown[]) => lookupEventRowBySlugMock(...args),
}));

vi.mock('@/shared/lib/utils/userUtils', () => ({
  fetchCurrentPersonMember: (...args: unknown[]) => fetchCurrentPersonMemberMock(...args),
  NO_PERSON_PROFILE_ERROR_CODE: 'USER_DATA_NOT_FOUND',
}));

vi.mock('@/lib/fetchParticipantBookings', () => ({
  fetchParticipantApplication: (...args: unknown[]) => fetchParticipantApplicationMock(...args),
  fetchParticipantBookings: (...args: unknown[]) => fetchParticipantBookingsMock(...args),
}));

vi.mock('@/lib/fetchActivityBookingBrowse', () => ({
  fetchActivityBookingBrowse: (...args: unknown[]) => fetchActivityBookingBrowseMock(...args),
}));

vi.mock('@/lib/activityBookingRpc', () => ({
  createActivityBooking: (...args: unknown[]) => createActivityBookingMock(...args),
  cancelActivityBooking: (...args: unknown[]) => cancelActivityBookingMock(...args),
}));

vi.mock('@/lib/fetchActivityWaiverConsents', () => ({
  fetchActivityWaiverConsentedOfferingIds: (...args: unknown[]) =>
    fetchActivityWaiverConsentedOfferingIdsMock(...args),
}));

vi.mock('@/lib/persistActivityBookingConsent', () => ({
  persistActivityBookingConsent: (...args: unknown[]) => persistActivityBookingConsentMock(...args),
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1' },
    organisations: [{ id: 'org-1' }],
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useActivityBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupEventRowBySlugMock.mockResolvedValue(
      ok({
        event_id: 'ev-1',
        event_name: 'Camp',
        organisation_id: 'org-1',
        event_code: 'camp',
      })
    );
    fetchCurrentPersonMemberMock.mockResolvedValue(
      ok({
        person: { id: 'person-1' },
        member: { id: 'member-1' },
        usedReducedFieldFallback: false,
      })
    );
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'approved',
      })
    );
    fetchActivityBookingBrowseMock.mockResolvedValue(ok([]));
    fetchParticipantBookingsMock.mockResolvedValue(ok([]));
    fetchActivityWaiverConsentedOfferingIdsMock.mockResolvedValue(ok(new Set<string>()));
    persistActivityBookingConsentMock.mockResolvedValue(ok(undefined));
  });

  it('reaches ready with application and browse data', async () => {
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
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
          sessions: [],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.data?.application.status).toBe('approved');
    expect(result.current.data?.offerings).toHaveLength(1);
  });

  it('returns not_approved when application status is not approved', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'submitted',
      })
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('not_approved'));
  });

  it('maps browse access denial to access_denied phase', async () => {
    fetchActivityBookingBrowseMock.mockResolvedValue(
      err({ code: 'ACTIVITY_BROWSE_QUERY', message: 'base_booking_access_denied' })
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('access_denied'));
  });

  it('validateSession returns canBook false for duplicate', async () => {
    fetchParticipantBookingsMock.mockResolvedValue(
      ok([
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
      ])
    );
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
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
              location_display: null,
              capacity: 10,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const validation = result.current.validateSession('sess-1');
    expect(validation?.duplicateBooking).toBe(true);
    expect(validation?.canBook).toBe(false);
  });

  it('bookSession calls create RPC and invalidates on success', async () => {
    createActivityBookingMock.mockResolvedValue(
      ok({ booking_id: 'new-book', status: 'confirmed' })
    );
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
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
              location_display: null,
              capacity: 10,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const bookResult = await result.current.bookSession('sess-1', true);
    expect(bookResult.ok).toBe(true);
    expect(createActivityBookingMock).toHaveBeenCalled();
  });

  it('bookSession persists consent after create when waiver required', async () => {
    createActivityBookingMock.mockResolvedValue(
      ok({ booking_id: 'new-book', status: 'confirmed' })
    );
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
        {
          id: 'off-1',
          name: 'Kayak',
          description: 'Activity waiver text',
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
              location_display: null,
              capacity: 10,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.validateSession('sess-1')?.consentRequired).toBe(true);
    const bookResult = await result.current.bookSession('sess-1', true);
    expect(bookResult.ok).toBe(true);
    expect(persistActivityBookingConsentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookingId: 'new-book',
        applicationId: 'app-1',
        verbatimText: 'Activity waiver text',
      })
    );
  });

  it('does not require consent when offering already has waiver on file', async () => {
    fetchActivityWaiverConsentedOfferingIdsMock.mockResolvedValue(ok(new Set(['off-1'])));
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
        {
          id: 'off-1',
          name: 'Kayak',
          description: 'Activity waiver text',
          location_display: null,
          booking_open_at: null,
          booking_close_at: null,
          bookingWindowOpen: true,
          consentRequired: false,
          consentText: null,
          sessions: [
            {
              id: 'sess-2',
              session_name: 'Afternoon',
              start_time: '2026-07-01T13:00:00.000Z',
              end_time: '2026-07-01T15:00:00.000Z',
              location_display: null,
              capacity: 10,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ])
    );
    createActivityBookingMock.mockResolvedValue(
      ok({ booking_id: 'book-2', status: 'confirmed' })
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.validateSession('sess-2')?.consentRequired).toBe(false);
    const bookResult = await result.current.bookSession('sess-2', false);
    expect(bookResult.ok).toBe(true);
    expect(persistActivityBookingConsentMock).not.toHaveBeenCalled();
  });

  it('bookSession blocks RPC when consent required but not acknowledged', async () => {
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
        {
          id: 'off-1',
          name: 'Kayak',
          description: 'Waiver',
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
              location_display: null,
              capacity: 10,
              allow_waitlist: false,
              capacityFull: false,
              waitlistOpen: false,
              confirmedCount: 0,
            },
          ],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const bookResult = await result.current.bookSession('sess-1', false);
    expect(!bookResult.ok && bookResult.error.code === 'ACTIVITY_BOOKING_CONSENT').toBe(true);
    expect(createActivityBookingMock).not.toHaveBeenCalled();
  });

  it('bookSession accepts waitlisted RPC outcome', async () => {
    createActivityBookingMock.mockResolvedValue(
      ok({ booking_id: 'wl-book', status: 'waitlisted' })
    );
    fetchActivityBookingBrowseMock.mockResolvedValue(
      ok([
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
              location_display: null,
              capacity: 10,
              allow_waitlist: true,
              capacityFull: true,
              waitlistOpen: true,
              confirmedCount: 10,
            },
          ],
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const bookResult = await result.current.bookSession('sess-1', true);
    expect(bookResult.ok).toBe(true);
    expect(createActivityBookingMock).toHaveBeenCalled();
    expect(persistActivityBookingConsentMock).not.toHaveBeenCalled();
  });

  it('cancelBooking calls cancel RPC on success', async () => {
    cancelActivityBookingMock.mockResolvedValue(ok(undefined));
    fetchParticipantBookingsMock.mockResolvedValue(
      ok([
        {
          id: 'book-1',
          session_id: 'sess-1',
          session_name: 'Morning',
          start_time: '2026-12-01T10:00:00.000Z',
          end_time: '2026-12-01T12:00:00.000Z',
          offering_name: 'Kayak',
          status: 'confirmed',
          booked_at: '2026-06-01T00:00:00.000Z',
          cancelled_at: null,
          cancellable: true,
          onWaitlist: false,
        },
      ])
    );
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const cancelResult = await result.current.cancelBooking('book-1');
    expect(cancelResult.ok).toBe(true);
    expect(cancelActivityBookingMock).toHaveBeenCalled();
  });

  it('returns no_application when person has no application row', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('no_application'));
  });

  it('bookSession does not call RPC when validation fails', async () => {
    const { result } = renderHook(() => useActivityBooking('camp'), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'submitted',
      })
    );
    await result.current.refetch();
    await waitFor(() => expect(result.current.phase).toBe('not_approved'));
    const bookResult = await result.current.bookSession('sess-1', true);
    expect(!bookResult.ok && bookResult.error.code === 'ACTIVITY_BOOKING_VALIDATION').toBe(true);
    expect(createActivityBookingMock).not.toHaveBeenCalled();
  });
});
