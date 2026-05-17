import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

/**
 * PR01 route matrix and session restoration. `AppSwitcher` visibility on `PortalAuthenticatedLayout`
 * is specified in PR01 verification; assert it in layout/integration tests that render real chrome—
 * this suite mocks `PortalAuthenticatedLayout` to an `<Outlet />` shell.
 */

const useSessionRestoration = vi.fn();
const loginHistoryRecorder = vi.fn(() => <div data-testid="login-history-recorder" />);

let isAuthenticated = false;

vi.mock('@solvera/pace-core/hooks', () => ({
  useSessionRestoration: () => useSessionRestoration(),
  useUnifiedAuth: () => ({
    isAuthenticated,
    organisationLoading: false,
  }),
}));

vi.mock('@/shared/components/LoginHistoryRecorder', () => ({
  LoginHistoryRecorder: () => loginHistoryRecorder(),
}));

vi.mock('@solvera/pace-core/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/components')>();
  return {
    ...actual,
    ProtectedRoute: ({
      loginPath,
      loadingFallback,
    }: {
      children?: ReactNode;
      loginPath: string;
      loadingFallback?: ReactNode;
    }) => {
      if (!isAuthenticated) {
        return (
          <div data-testid="protected-redirect" data-login-path={loginPath}>
            {loadingFallback ?? null}
          </div>
        );
      }
      return <Outlet />;
    },
    SessionRestorationLoader: ({
      children,
      message,
    }: {
      children: ReactNode;
      message?: string;
    }) => (
      <div data-testid="session-restoration-loader" data-message={message}>
        {children}
      </div>
    ),
    LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('@/pages/auth/LoginPage', () => ({
  LoginPage: () => <h1>Login surface</h1>,
}));

vi.mock('@/pages/auth/public/RegistrationPage', () => ({
  RegistrationPage: () => <h1>Register surface</h1>,
}));

vi.mock('@/pages/DashboardPage', () => ({
  DashboardPage: () => <h1>Dashboard surface</h1>,
}));

vi.mock('@/pages/NotFoundPage', () => ({
  NotFoundPage: () => <h1>Not found surface</h1>,
}));

vi.mock('@/shared/components/OrganisationLoadingGate', () => ({
  OrganisationLoadingGate: () => (
    <div data-testid="org-gate">
      <Outlet />
    </div>
  ),
}));

vi.mock('@/shared/components/PortalAuthenticatedLayout', () => ({
  PortalAuthenticatedLayout: () => (
    <main data-testid="portal-layout">
      <Outlet />
    </main>
  ),
}));

vi.mock('@/shared/components/ProfileCompleteLayout', () => ({
  ProfileCompleteLayout: ({ children }: { children: ReactNode }) => (
    <main data-testid="profile-complete-layout">{children}</main>
  ),
}));

vi.mock('@/pages/ProfileCompletionWizardPage', () => ({
  ProfileCompletionWizardPage: () => <h1>Profile complete wizard</h1>,
}));

vi.mock('@/pages/public/TokenApprovalPage', () => ({
  TokenApprovalPage: () => <h1>Token approval surface</h1>,
}));

function renderApp(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App shell routing (PR01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = false;
  });

  it('mounts LoginHistoryRecorder and session restoration hook', () => {
    renderApp('/login');
    expect(screen.getByTestId('login-history-recorder')).toBeInTheDocument();
    expect(useSessionRestoration).toHaveBeenCalled();
  });

  it('renders login without protected redirect', async () => {
    renderApp('/login');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login surface' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-redirect')).toBeNull();
  });

  it('renders register without protected redirect', async () => {
    renderApp('/register');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Register surface' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-redirect')).toBeNull();
  });

  it('gates protected dashboard behind auth with return URL', async () => {
    renderApp('/dashboard');
    await waitFor(() => {
      expect(screen.getByTestId('protected-redirect')).toBeInTheDocument();
    });
    expect(screen.getByTestId('protected-redirect')).toHaveAttribute(
      'data-login-path',
      '/login?redirect=%2Fdashboard'
    );
    expect(screen.getByTestId('session-restoration-loader')).toHaveAttribute(
      'data-message',
      'Checking authentication…'
    );
  });

  it('renders protected shell when authenticated', async () => {
    isAuthenticated = true;
    renderApp('/dashboard');
    await waitFor(() => {
      expect(screen.getByTestId('org-gate')).toBeInTheDocument();
      expect(screen.getByTestId('portal-layout')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Dashboard surface' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-redirect')).toBeNull();
  });

  it('renders profile-complete in navigation-free layout when authenticated', async () => {
    isAuthenticated = true;
    renderApp('/profile-complete');
    await waitFor(() => {
      expect(screen.getByTestId('profile-complete-layout')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Profile complete wizard' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('portal-layout')).toBeNull();
  });

  it('renders token approval route without protected redirect (PR20)', async () => {
    renderApp('/approvals/some-token');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Token approval surface' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-redirect')).toBeNull();
  });
});
