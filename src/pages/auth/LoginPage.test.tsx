import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';

vi.mock('@solvera/pace-core/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/components')>();
  return {
    ...actual,
    PaceLoginPage: () => <div data-testid="pace-login" />,
  };
});

describe('LoginPage', () => {
  it('links to the public registration route', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const register = screen.getByRole('link', { name: 'Register' });
    expect(register.getAttribute('href')).toBe('/register');
  });
});
