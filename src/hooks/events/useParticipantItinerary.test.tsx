import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useParticipantItinerary } from '@/hooks/events/useParticipantItinerary';
import { err, ok } from '@solvera/pace-core/types';

const lookupEventRowBySlugMock = vi.hoisted(() => vi.fn());
const fetchCurrentPersonMemberMock = vi.hoisted(() => vi.fn());
const fetchParticipantApplicationMock = vi.hoisted(() => vi.fn());
const fetchParticipantItineraryMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/events/useEventHub', () => ({
  lookupEventRowBySlug: (...args: unknown[]) => lookupEventRowBySlugMock(...args),
}));

vi.mock('@/shared/lib/utils/userUtils', () => ({
  fetchCurrentPersonMember: (...args: unknown[]) => fetchCurrentPersonMemberMock(...args),
  NO_PERSON_PROFILE_ERROR_CODE: 'USER_DATA_NOT_FOUND',
}));

vi.mock('@/lib/fetchParticipantBookings', () => ({
  fetchParticipantApplication: (...args: unknown[]) => fetchParticipantApplicationMock(...args),
}));

vi.mock('@/lib/fetchParticipantItinerary', () => ({
  fetchParticipantItinerary: (...args: unknown[]) => fetchParticipantItineraryMock(...args),
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

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const eventRow = {
  event_id: 'ev-1',
  event_name: 'Camp',
  event_code: 'camp',
  organisation_id: 'org-1',
} as never;

describe('useParticipantItinerary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupEventRowBySlugMock.mockResolvedValue(ok(eventRow));
    fetchCurrentPersonMemberMock.mockResolvedValue(
      ok({ person: { id: 'person-1' }, member: { id: 'member-1' } })
    );
  });

  it('returns not_scoped when the participant has no application', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(ok(null));

    const { result } = renderHook(() => useParticipantItinerary('camp'), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toBe('not_scoped');
    });
  });

  it('returns ready_empty when scoped but itinerary has no derived days', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'approved',
      })
    );
    fetchParticipantItineraryMock.mockResolvedValue(
      ok({
        applicationId: 'app-1',
        assignments: [],
        transport: [],
        activities: [],
        accommodations: [],
      })
    );

    const { result } = renderHook(() => useParticipantItinerary('camp'), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready_empty');
    });
  });

  it('returns ready with derived day groups for assigned logistics', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'approved',
      })
    );
    fetchParticipantItineraryMock.mockResolvedValue(
      ok({
        applicationId: 'app-1',
        assignments: [
          {
            id: 'as-1',
            application_id: 'app-1',
            event_id: 'ev-1',
            organisation_id: 'org-1',
            resource_id: 'tr-1',
            resource_type: 'transport',
          },
        ],
        transport: [
          {
            id: 'tr-1',
            event_id: 'ev-1',
            departure_time: '2026-01-10T08:00:00Z',
            arrival_time: '2026-01-10T16:00:00Z',
            departure_timezone: 'UTC',
            arrival_timezone: 'UTC',
            status: 'booked',
            transport_number: 'Coach',
            departure_display_name: null,
            arrival_display_name: null,
            departure_short_address: null,
            arrival_short_address: null,
            mode: 'bus',
            notes: null,
          },
        ],
        activities: [],
        accommodations: [],
      })
    );

    const { result } = renderHook(() => useParticipantItinerary('camp'), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    expect(result.current.data?.itinerary.days.length).toBeGreaterThan(0);
  });

  it('returns not_found for missing events', async () => {
    lookupEventRowBySlugMock.mockResolvedValue(
      err({ code: 'EVENT_NOT_FOUND', message: 'Event could not be found.' })
    );

    const { result } = renderHook(() => useParticipantItinerary('missing'), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toBe('not_found');
    });
  });

  it('returns error when itinerary fetch fails', async () => {
    fetchParticipantApplicationMock.mockResolvedValue(
      ok({
        id: 'app-1',
        event_id: 'ev-1',
        organisation_id: 'org-1',
        person_id: 'person-1',
        status: 'approved',
      })
    );
    fetchParticipantItineraryMock.mockResolvedValue(
      err({ code: 'ITINERARY_ASSIGNMENT_QUERY', message: 'Could not load itinerary assignments.' })
    );

    const { result } = renderHook(() => useParticipantItinerary('camp'), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toBe('error');
    });
    expect(result.current.errorMessage).toMatch(/assignments/i);
  });
});
