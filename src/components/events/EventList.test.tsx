import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { EventId, FileReference } from '@solvera/pace-core/types';
import * as unified from '@solvera/pace-core/providers';
import { EventList } from '@/components/events/EventList';
import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useSecureSupabase: () => null,
  };
});

vi.mock('@/hooks/events/useFileReferences', () => ({
  useFileReferences: vi.fn(),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useFileDisplay: () => ({ url: 'https://signed.example/logo.png', isLoading: false }),
}));

import { useFileReferences } from '@/hooks/events/useFileReferences';
import * as paceTypes from '@solvera/pace-core/types';

const baseEvent = {
  event_id: 'e1',
  event_name: 'Summer camp',
  organisation_id: 'o1',
  registration_scope: 'camp',
  created_at: null,
  created_by: null,
  description: null,
  event_code: 'summer-camp',
  event_colours: null,
  event_date: null,
  event_days: null,
  event_email: null,
  event_venue: null,
  expected_participants: null,
  is_visible: true,
  public_readable: true,
  participant_admin_email: null,
  participant_blurb: null,
  participant_website_url: null,
  typical_unit_size: null,
  updated_at: null,
  updated_by: null,
  logo_id: null,
} as unknown as DashboardEvent;

const dummyRef = {
  id: 'fr1',
  table_name: 'core_events',
  record_id: 'e1',
  file_path: 'x/event_logo/logo.png',
  file_metadata: { fileName: 'logo', fileType: 'image/png', bucket: 'public-files', category: 'event_logo' },
  app_id: 'app-test',
  is_public: true,
  created_at: '2020-01-01',
  updated_at: '2020-01-01',
} satisfies FileReference;

function mockLogoRefs(map: Map<EventId, FileReference | null>, opts?: { isError?: boolean }) {
  vi.mocked(useFileReferences).mockReturnValue({
    refByEventId: map,
    isLoading: false,
    isError: opts?.isError ?? false,
    error: opts?.isError ? new Error('fail') : null,
  });
}

describe('EventList', () => {
  beforeEach(() => {
    vi.spyOn(unified, 'useOrganisationsContextOptional').mockReturnValue({
      selectedOrganisation: { id: 'o1', name: 'Org', display_name: 'Org' },
      organisations: [{ id: 'o1', name: 'Org', display_name: 'Org' }],
    } as ReturnType<(typeof unified)['useOrganisationsContextOptional']>);
    const m = new Map();
    m.set(paceTypes.createEventId('e1'), dummyRef);
    mockLogoRefs(m);
  });

  it('shows Apply navigation when no application and renders authenticated logo affordance', async () => {
    const user = setupUser();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<EventList eventsByCategory={{ camp: [baseEvent] }} applicationStatusByEventId={{}} />} />
          <Route path=":eventSlug/application" element={<p data-testid="app-route">application</p>} />
          <Route path=":eventSlug" element={<p data-testid="hub-route">hub</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Summer camp/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Summer camp logo/i })).toHaveAttribute(
      'src',
      'https://signed.example/logo.png'
    );

    await user.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(screen.getByTestId('app-route')).toBeInTheDocument();
  });

  it('shows Resume navigation for draft applications', async () => {
    const user = setupUser();
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={<EventList eventsByCategory={{ camp: [baseEvent] }} applicationStatusByEventId={{ e1: 'draft' }} />}
          />
          <Route path=":eventSlug/application" element={<p data-testid="app-route">application</p>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /^Resume$/i }));
    expect(screen.getByTestId('app-route')).toBeInTheDocument();
  });

  it('shows Manage navigation for non-draft application', async () => {
    const user = setupUser();
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={
              <EventList eventsByCategory={{ camp: [baseEvent] }} applicationStatusByEventId={{ e1: 'approved' }} />
            }
          />
          <Route path=":eventSlug" element={<p data-testid="hub-route">hub</p>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /^Manage$/i }));
    expect(screen.getByTestId('hub-route')).toBeInTheDocument();
  });

  it('disables Apply when the form response window is not open yet', () => {
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={
              <EventList
                eventsByCategory={{ camp: [baseEvent] }}
                applicationStatusByEventId={{}}
                formResponseOpenByEventId={{}}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Not open yet/i })).toBeDisabled();
  });

  it('shows event venue under the date when present', () => {
    const withVenue = { ...baseEvent, event_date: '2026-06-01', event_venue: 'Gilwell Park' } as DashboardEvent;
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={<EventList eventsByCategory={{ camp: [withVenue] }} applicationStatusByEventId={{}} />}
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Gilwell Park')).toBeInTheDocument();
    expect(screen.getByText(formatEventDateForDisplay('2026-06-01'))).toBeInTheDocument();
  });

  it('omits venue line when event_venue is empty', () => {
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={<EventList eventsByCategory={{ camp: [baseEvent] }} applicationStatusByEventId={{}} />}
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText(/Gilwell Park/i)).not.toBeInTheDocument();
  });

  it('shows empty state when no events are visible', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<EventList eventsByCategory={{}} applicationStatusByEventId={{}} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/No visible events yet/i)).toBeInTheDocument();
  });

  it('disables the action button when event_code is missing', async () => {
    const user = setupUser();
    const noCode = { ...baseEvent, event_code: '' } as DashboardEvent;
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={<EventList eventsByCategory={{ camp: [noCode] }} applicationStatusByEventId={{}} />}
          />
          <Route path=":eventSlug/application" element={<p data-testid="app-route">application</p>} />
        </Routes>
      </MemoryRouter>
    );

    const apply = screen.getByRole('button', { name: /^Apply$/i });
    expect(apply).toBeDisabled();
    await user.click(apply);
    expect(screen.queryByTestId('app-route')).not.toBeInTheDocument();
  });

  it('shows logo load failure affordance when file references query fails', () => {
    mockLogoRefs(new Map(), { isError: true });
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route path="/dash" element={<EventList eventsByCategory={{ camp: [baseEvent] }} applicationStatusByEventId={{}} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('SC')).toBeInTheDocument();
    expect(screen.getByText(/Event logo could not be loaded/i)).toBeInTheDocument();
  });
});
