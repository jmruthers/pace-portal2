import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ActivityBookingPage } from '@/pages/events/ActivityBookingPage';
import type { ActivityBookingPhase } from '@/hooks/events/useActivityBooking';

const useActivityBookingMock = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/events/useActivityBooking', () => ({
  useActivityBooking: (...args: unknown[]) => useActivityBookingMock(...args),
}));

const proxyState = vi.hoisted(() => ({ isProxyActive: false }));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxyState,
}));

vi.mock('@/shared/components/ProxyModeBanner', () => ({
  ProxyModeBanner: () => <p>Proxy mode banner</p>,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Guard access denied</p>,
}));

const authState = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: authState.isAuthenticated }),
}));

const refetchStub = vi.fn();
const bookSessionStub = vi.fn();
const cancelBookingStub = vi.fn();
const validateSessionStub = vi.fn();

function stubVm(patch: Partial<ReturnType<typeof useActivityBookingMock>>) {
  useActivityBookingMock.mockReturnValue({
    phase: 'loading' as ActivityBookingPhase,
    data: undefined,
    errorMessage: null,
    notFound: false,
    reservedSlug: false,
    refetch: refetchStub,
    validateSession: validateSessionStub,
    bookSession: bookSessionStub,
    cancelBooking: cancelBookingStub,
    bookPending: false,
    cancelPending: false,
    lastActionError: null,
    clearLastActionError: vi.fn(),
    ...patch,
  });
}

describe('ActivityBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
    proxyState.isProxyActive = false;
    validateSessionStub.mockReturnValue({
      bookingWindowOpen: true,
      capacityFull: false,
      waitlistOpen: false,
      duplicateBooking: false,
      sessionConflict: false,
      conflictingSession: null,
      eligibilityDenied: false,
      consentRequired: false,
      consentText: null,
      canBook: true,
    });
  });

  function renderPage(path = '/camp/activities') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":eventSlug/activities" element={<ActivityBookingPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  const readyData = () => ({
    event: { event_name: 'Summer camp', event_id: 'ev-1' },
    application: {
      id: 'app-1',
      event_id: 'ev-1',
      organisation_id: 'org-1',
      person_id: 'person-1',
      status: 'approved',
    },
    offerings: [
      {
        id: 'off-1',
        name: 'Kayak',
        description: 'On the lake',
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
            capacity: 10,
            allow_waitlist: true,
            capacityFull: false,
            waitlistOpen: false,
            confirmedCount: 0,
          },
        ],
      },
    ],
    bookings: [
      {
        id: 'book-1',
        session_id: 'sess-2',
        session_name: 'Afternoon',
        start_time: '2026-07-02T14:00:00.000Z',
        end_time: '2026-07-02T16:00:00.000Z',
        offering_name: 'Archery',
        status: 'confirmed' as const,
        booked_at: '2026-06-01T00:00:00.000Z',
        cancelled_at: null,
        cancellable: true,
        onWaitlist: false,
      },
    ],
  });

  it('renders browse and bookings when ready', () => {
    stubVm({ phase: 'ready', data: readyData() });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Activity booking' })).toBeInTheDocument();
    expect(screen.getByText('Kayak')).toBeInTheDocument();
    expect(screen.getByText('Archery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
  });

  it('shows access denied without organiser internals', () => {
    stubVm({
      phase: 'access_denied',
      errorMessage: 'You cannot book activities for this event.',
    });
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot book activities/i)).toBeInTheDocument();
    expect(screen.queryByText(/token_hash/i)).not.toBeInTheDocument();
  });

  it('blocks booking UI when application is not approved', () => {
    stubVm({
      phase: 'not_approved',
      data: {
        ...readyData(),
        application: { ...readyData().application, status: 'submitted' },
      },
    });
    renderPage();
    expect(screen.getByText(/application not approved/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book session' })).not.toBeInTheDocument();
  });

  it('surfaces validation block for closed booking window', () => {
    validateSessionStub.mockReturnValue({
      bookingWindowOpen: false,
      capacityFull: false,
      waitlistOpen: false,
      duplicateBooking: false,
      sessionConflict: false,
      conflictingSession: null,
      eligibilityDenied: false,
      consentRequired: false,
      consentText: null,
      canBook: false,
    });
    stubVm({
      phase: 'ready',
      data: {
        ...readyData(),
        offerings: [
          {
            ...readyData().offerings[0],
            bookingWindowOpen: false,
          },
        ],
      },
    });
    renderPage();
    expect(screen.getAllByText(/booking is not open/i).length).toBeGreaterThan(0);
  });

  it('hides book and cancel actions when proxy mode is active', () => {
    proxyState.isProxyActive = true;
    stubVm({ phase: 'ready', data: readyData() });
    renderPage();
    expect(screen.queryByRole('button', { name: 'Book session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('calls cancelBooking when confirming cancel dialog', async () => {
    const user = setupUser();
    cancelBookingStub.mockResolvedValue({ ok: true, data: undefined });
    stubVm({ phase: 'ready', data: readyData() });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => {
      expect(cancelBookingStub).toHaveBeenCalledWith('book-1');
    });
  });
});
