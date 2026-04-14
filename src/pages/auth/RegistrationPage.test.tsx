import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UnifiedAuthContextValue } from '@solvera/pace-core/types';
import * as paceCore from '@solvera/pace-core';
import { RegistrationPage } from '@/pages/auth/public/RegistrationPage';

vi.mock('@solvera/pace-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core')>();
  return {
    ...actual,
    useUnifiedAuthContext: vi.fn(),
  };
});

const mockAuth = vi.mocked(paceCore.useUnifiedAuthContext);

function stubAuth(overrides: Partial<UnifiedAuthContextValue>) {
  mockAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    sessionRestoration: {
      isRestoring: false,
      hasTimedOut: false,
      error: null,
    },
    ...overrides,
  } as UnifiedAuthContextValue);
}

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubAuth({});
  });

  it('shows loading while auth or session restoration is in progress', () => {
    stubAuth({ isLoading: true });
    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
  });

  it('redirects authenticated users to home', () => {
    stubAuth({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('home')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Create account' })).toBeNull();
  });

  it('renders generic placeholder when not authenticated', () => {
    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeTruthy();
    expect(
      screen.getByText(/Self-service PACE account creation will be available here/i)
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to sign in' })).toBeTruthy();
  });

  it('navigates to login when primary action is used', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<div data-testid="login">Login</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Go to sign in' }));
    expect(screen.getByTestId('login')).toBeTruthy();
  });

  it('does not change copy when event or form query params are present', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/register']}>
        <RegistrationPage />
      </MemoryRouter>
    );
    const withoutParams = screen.getByRole('heading', { name: 'Create account' }).textContent;
    unmount();

    render(
      <MemoryRouter initialEntries={['/register?eventSlug=e1&formSlug=f1']}>
        <RegistrationPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Create account' }).textContent).toBe(withoutParams);
  });

  it('does not surface billing or payment content', () => {
    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/billing|payment/i)).toBeNull();
  });
});
