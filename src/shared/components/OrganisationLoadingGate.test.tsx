import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganisationLoadingGate } from '@/shared/components/OrganisationLoadingGate';

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: vi.fn(),
}));

import { useUnifiedAuth } from '@solvera/pace-core/hooks';

describe('OrganisationLoadingGate', () => {
  it('shows loading spinner while organisation context loads', () => {
    vi.mocked(useUnifiedAuth).mockReturnValue({
      isAuthenticated: true,
      organisationLoading: true,
    } as never);

    render(
      <MemoryRouter>
        <Routes>
          <Route element={<OrganisationLoadingGate />}>
            <Route path="/" element={<p>Child</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/loading organisation context/i)).toBeInTheDocument();
  });

  it('renders outlet when not loading', () => {
    vi.mocked(useUnifiedAuth).mockReturnValue({
      isAuthenticated: true,
      organisationLoading: false,
    } as never);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<OrganisationLoadingGate />}>
            <Route path="/" element={<p>Visible</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Visible')).toBeInTheDocument();
  });
});
