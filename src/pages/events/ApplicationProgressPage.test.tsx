import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApplicationProgressPage } from '@/pages/events/ApplicationProgressPage';
import { SENSITIVE_PROGRESS_KEYS } from '@/lib/applicationProgressContracts';
import type { ApplicationProgressPhase } from '@/hooks/events/useApplicationProgress';
import type { ApplicationProgressCheckRow } from '@/lib/applicationProgressContracts';

const useApplicationProgressMock = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/events/useApplicationProgress', () => ({
  useApplicationProgress: (...args: unknown[]) => useApplicationProgressMock(...args),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Guard access denied</p>,
}));

const authState = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: authState.isAuthenticated }),
}));

const refetchStub = vi.fn();

function stubVm(patch: Partial<ReturnType<typeof useApplicationProgressMock>>) {
  useApplicationProgressMock.mockReturnValue({
    phase: 'loading' as ApplicationProgressPhase,
    data: undefined,
    errorMessage: null,
    notFound: false,
    reservedSlug: false,
    refetch: refetchStub,
    ...patch,
  });
}

describe('ApplicationProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
  });

  function renderPage(path = `/camp/applications/11111111-1111-4111-a111-111111111111`) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":eventSlug/applications/:applicationId" element={<ApplicationProgressPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  const readyFixture = () => ({
    phase: 'ready' as const,
    data: {
      event: { event_name: 'Summer gala' },
      progress: {
        application: {
          id: '11111111-1111-4111-a111-111111111111',
          event_id: '22222222-2222-4222-a222-222222222222',
          organisation_id: '33333333-3333-4333-a333-333333333333',
          person_id: '44444444-4444-4444-a444-444444444444',
          registration_type_id: '55555555-5555-4555-a555-555555555555',
          form_id: null,
          referee_name: 'Taylor Referee',
          status: 'under_review',
          submitted_at: '2026-06-09T01:02:03.000Z',
        },
        registration_type: { id: '77777777-7777-4777-a777-777777777777', name: 'Standard', description: null },
        checks: [
          {
            id: '88888888-8888-4888-a888-888888888888',
            requirement_id: '99999999-9999-4999-a999-999999999999',
            sort_order: 1,
            check_type: 'payment',
            participant_check_label: 'Payment',
            status: 'pending',
          },
          {
            id: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
            requirement_id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
            sort_order: 2,
            check_type: 'referee',
            participant_check_label: 'Referee approval',
            status: 'satisfied',
          },
        ] satisfies ApplicationProgressCheckRow[],
      },
    },
    errorMessage: null,
    notFound: false,
    reservedSlug: false,
    refetch: refetchStub,
  });

  it('renders application status and checks sorted by sort_order with raw status literals', () => {
    stubVm(readyFixture());
    renderPage();
    expect(screen.getByRole('heading', { name: /summer gala/i })).toBeInTheDocument();
    expect(screen.getByText('under_review')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('Referee approval')).toBeInTheDocument();
    expect(screen.getByText('satisfied')).toBeInTheDocument();
    expect(screen.getByText(/taylor referee/i)).toBeInTheDocument();
  });

  it('renders checks in sort_order ascending when RPC returns reverse order', () => {
    const reverseChecks: ApplicationProgressCheckRow[] = [
      {
        id: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
        requirement_id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
        sort_order: 2,
        check_type: 'referee',
        participant_check_label: 'Referee approval',
        status: 'satisfied',
      },
      {
        id: '88888888-8888-4888-a888-888888888888',
        requirement_id: '99999999-9999-4999-a999-999999999999',
        sort_order: 1,
        check_type: 'payment',
        participant_check_label: 'Payment',
        status: 'pending',
      },
    ];
    stubVm({
      ...readyFixture(),
      data: {
        ...readyFixture().data,
        progress: {
          ...readyFixture().data.progress,
          checks: reverseChecks,
        },
      },
    });
    renderPage();
    const labels = screen.getAllByText(/^(Payment|Referee approval)$/);
    expect(labels.map((el) => el.textContent)).toEqual(['Payment', 'Referee approval']);
  });

  it('shows empty requirements copy when no checks are recorded', () => {
    stubVm({
      ...readyFixture(),
      data: {
        ...readyFixture().data,
        progress: {
          ...readyFixture().data.progress,
          checks: [],
        },
      },
    });
    renderPage();
    expect(screen.getByText(/no approval steps are recorded/i)).toBeInTheDocument();
  });

  it('renders failed and waived check statuses', () => {
    const failedWaivedChecks: ApplicationProgressCheckRow[] = [
      {
        id: '88888888-8888-4888-a888-888888888888',
        requirement_id: '99999999-9999-4999-a999-999999999999',
        sort_order: 1,
        check_type: 'payment',
        participant_check_label: 'Payment',
        status: 'failed',
      },
      {
        id: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
        requirement_id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
        sort_order: 2,
        check_type: 'referee',
        participant_check_label: 'Referee approval',
        status: 'waived',
      },
    ];
    stubVm({
      ...readyFixture(),
      data: {
        ...readyFixture().data,
        progress: {
          ...readyFixture().data.progress,
          checks: failedWaivedChecks,
        },
      },
    });
    renderPage();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('waived')).toBeInTheDocument();
  });

  it('does not surface sensitive field names in serialised progress data', () => {
    const vm = readyFixture();
    stubVm(vm);
    renderPage();
    const serial = JSON.stringify(vm.data.progress);
    for (const k of SENSITIVE_PROGRESS_KEYS) {
      expect(serial).not.toContain(k);
    }
  });

  it('redirects unauthenticated users to sign in with return URL (PR01 handoff)', async () => {
    authState.isAuthenticated = false;
    const appId = '11111111-1111-4111-a111-111111111111';
    renderPage(`/camp/applications/${appId}`);
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent(`/camp/applications/${appId}`)}`,
        { replace: true }
      )
    );
  });

  it('shows a single access denied presentation for denied phase', () => {
    stubVm({
      phase: 'access_denied',
      data: undefined,
      errorMessage: 'You cannot view this application.',
      notFound: false,
      reservedSlug: false,
      refetch: refetchStub,
    });
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/you cannot view this application/i)).toBeInTheDocument();
  });

  it('surfaces hook errorMessage on access denied when provided', () => {
    stubVm({
      phase: 'access_denied',
      data: undefined,
      errorMessage: 'Custom denial from RPC.',
      notFound: false,
      reservedSlug: false,
      refetch: refetchStub,
    });
    renderPage();
    expect(screen.getByText(/custom denial from rpc/i)).toBeInTheDocument();
  });
});
