import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfileEditProxyPage } from '@/pages/member-profile/ProfileEditProxyPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const guardState = vi.hoisted(() => ({
  phase: 'ready' as 'loading' | 'ready' | 'denied',
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({
    children,
    loading,
    fallback,
  }: {
    children: ReactNode;
    loading: ReactNode;
    fallback: ReactNode;
  }) => {
    if (guardState.phase === 'loading') return loading;
    if (guardState.phase === 'denied') return fallback;
    return <>{children}</>;
  },
  AccessDenied: () => <p>Access denied</p>,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

const orgState = vi.hoisted(() => ({
  selectedOrganisation: { id: 'org-1' } as { id: string } | null,
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () =>
    orgState.selectedOrganisation
      ? { selectedOrganisation: orgState.selectedOrganisation }
      : null,
}));

const proxy = vi.hoisted(() => ({
  setProxyTargetMemberId: vi.fn(),
  validationError: null as string | null,
  isValidating: false,
  isProxyActive: false,
  targetMemberId: null as string | null,
  targetPersonId: null as string | null,
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    setProxyTargetMemberId: proxy.setProxyTargetMemberId,
    validationError: proxy.validationError,
    isValidating: proxy.isValidating,
    isProxyActive: proxy.isProxyActive,
    targetMemberId: proxy.targetMemberId,
    targetPersonId: proxy.targetPersonId,
  }),
}));

const dash = vi.hoisted(() => ({
  data: null as { person: { id: string }; member: { organisation_id: string }; profileProgress: unknown; eventsByCategory: unknown } | null,
  isLoading: false,
  isError: false,
  error: null as Error | null,
}));

vi.mock('@/shared/hooks/useProxyDashboard', () => ({
  useProxyDashboard: () => ({
    data: dash.data,
    isLoading: dash.isLoading,
    isError: dash.isError,
    error: dash.error,
  }),
}));

vi.mock('@/components/contacts/ContactSummaryCard', () => ({
  ContactSummaryCard: () => <div>Contact summary</div>,
}));

vi.mock('@/components/events/EventList', () => ({
  EventList: () => <div>Events</div>,
}));

vi.mock('@/components/member-profile/ProfilePrompts', () => ({
  ProfilePrompts: () => <div>Prompts</div>,
}));

vi.mock('@/shared/components/ProxyModeBanner', () => ({
  ProxyModeBanner: () => <div>Proxy banner</div>,
}));

function renderPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/profile/edit" element={<ProfileEditProxyPage />} />
          <Route path="/profile/edit/:memberId" element={<ProfileEditProxyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProfileEditProxyPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    guardState.phase = 'ready';
    orgState.selectedOrganisation = { id: 'org-1' };
    proxy.setProxyTargetMemberId.mockClear();
    proxy.validationError = null;
    proxy.isValidating = false;
    proxy.isProxyActive = false;
    proxy.targetMemberId = null;
    proxy.targetPersonId = null;
    dash.data = null;
    dash.isLoading = false;
    dash.isError = false;
    dash.error = null;
  });

  it('shows permission guard loading state', async () => {
    guardState.phase = 'loading';

    renderPage('/profile/edit/m1');

    expect(await screen.findByLabelText(/checking access/i)).toBeInTheDocument();
  });

  it('shows access denied when guard denies', async () => {
    guardState.phase = 'denied';

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  it('shows aligning spinner when stored target differs from route', async () => {
    proxy.targetMemberId = 'm-old';

    renderPage('/profile/edit/m-new');

    expect(await screen.findByLabelText(/starting delegated session/i)).toBeInTheDocument();
  });

  it('requires organisation before delegated workspace', async () => {
    orgState.selectedOrganisation = null;

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/organisation required/i)).toBeInTheDocument();
  });

  it('shows missing member id without route param', async () => {
    renderPage('/profile/edit');

    expect(await screen.findByText(/missing member id/i)).toBeInTheDocument();
  });

  it('shows spinner while proxy target aligns with route', async () => {
    proxy.targetMemberId = null;

    renderPage('/profile/edit/m1');

    expect(await screen.findByLabelText(/starting delegated session/i)).toBeInTheDocument();
    expect(proxy.setProxyTargetMemberId).toHaveBeenCalledWith('m1');
  });

  it('shows validating spinner', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isValidating = true;

    renderPage('/profile/edit/m1');

    expect(await screen.findByLabelText(/validating delegated access/i)).toBeInTheDocument();
  });

  it('shows validation error from proxy mode', async () => {
    proxy.targetMemberId = 'm1';
    proxy.validationError = 'Proxy access was denied.';

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/proxy access was denied/i)).toBeInTheDocument();
  });

  it('shows unavailable when proxy never activates', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = false;
    proxy.validationError = null;

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/delegated session unavailable/i)).toBeInTheDocument();
  });

  it('shows workspace error when dashboard query fails', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.isError = true;
    dash.error = new Error('Workspace failed');

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/workspace failed/i)).toBeInTheDocument();
  });

  it('shows generic workspace error when failure is not an Error instance', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.isError = true;
    dash.error = 'boom' as unknown as Error;

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/could not load delegated workspace/i)).toBeInTheDocument();
  });

  it('shows loading workspace state', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.isLoading = true;

    renderPage('/profile/edit/m1');

    expect(await screen.findByLabelText(/loading delegated workspace/i)).toBeInTheDocument();
  });

  it('shows error when person payload is missing', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.isError = false;
    dash.data = {
      person: null as never,
      member: { organisation_id: 'org-1' },
      profileProgress: {},
      eventsByCategory: {},
    };

    renderPage('/profile/edit/m1');

    expect(await screen.findByText(/could not load delegated workspace/i)).toBeInTheDocument();
  });

  it('navigates home from validation error state', async () => {
    const user = userEvent.setup();
    proxy.targetMemberId = 'm1';
    proxy.validationError = 'Proxy access was denied.';

    renderPage('/profile/edit/m1');

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('navigates home when delegated session is unavailable', async () => {
    const user = userEvent.setup();
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = false;
    proxy.validationError = null;

    renderPage('/profile/edit/m1');

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('navigates home from workspace load error', async () => {
    const user = userEvent.setup();
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.isError = true;
    dash.error = new Error('fail');

    renderPage('/profile/edit/m1');

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('navigates home from success workspace', async () => {
    const user = userEvent.setup();
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.data = {
      person: { id: 'p1' },
      member: { organisation_id: 'org-1' },
      profileProgress: {},
      eventsByCategory: {},
    };

    renderPage('/profile/edit/m1');

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('renders delegated workspace when data is ready', async () => {
    proxy.targetMemberId = 'm1';
    proxy.isProxyActive = true;
    proxy.targetPersonId = 'p1';
    dash.data = {
      person: { id: 'p1' },
      member: { organisation_id: 'org-1' },
      profileProgress: {},
      eventsByCategory: {},
    };

    renderPage('/profile/edit/m1');

    expect(await screen.findByRole('heading', { name: /delegated workspace/i })).toBeInTheDocument();
    expect(screen.getByText('Contact summary')).toBeInTheDocument();
  });
});
