import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as itineraryHook from '@/hooks/events/useParticipantItinerary';
import { ParticipantItineraryView } from '@/components/events/ParticipantItineraryView';

function renderAt(path = '/camp/itinerary') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:eventSlug/itinerary" element={<ParticipantItineraryView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ParticipantItineraryView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders day-grouped itinerary without planner controls', () => {
    vi.spyOn(itineraryHook, 'useParticipantItinerary').mockReturnValue({
      phase: 'ready',
      data: {
        event: { event_name: 'Camp' } as never,
        applicationId: 'app-1',
        itinerary: {
          dayGroups: [],
          days: [
            {
              dayKey: '2026-01-10',
              items: [
                {
                  entry: {
                    dayKey: '2026-01-10',
                    localDate: '2026-01-10',
                    resourceType: 'transport',
                    resourceId: 'tr-1',
                    entryKind: 'departure',
                    orderingTimestamp: '2026-01-10T08:00:00Z',
                    orderingEpochMs: 0,
                    sortCategory: 'timestamp',
                    timezone: 'UTC',
                    timezoneSource: 'departure_timezone',
                  },
                  title: 'Coach',
                  detail: null,
                  whenLabel: 'Departure · 10 Jan 2026',
                },
              ],
            },
          ],
        },
      },
      errorMessage: null,
      notFound: false,
      reservedSlug: false,
      refetch: vi.fn(),
    });

    renderAt();

    expect(screen.getByRole('heading', { name: /Camp itinerary/i })).toBeInTheDocument();
    expect(screen.getByText('Coach')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/map/i)).not.toBeInTheDocument();
  });

  it('shows not-scoped explanatory copy', () => {
    vi.spyOn(itineraryHook, 'useParticipantItinerary').mockReturnValue({
      phase: 'not_scoped',
      data: undefined,
      errorMessage: null,
      notFound: false,
      reservedSlug: false,
      refetch: vi.fn(),
    });

    renderAt();
    expect(screen.getByText(/No application for this event/i)).toBeInTheDocument();
  });
});
