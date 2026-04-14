import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalAuthenticatedLayout } from '@/shared/components/PortalAuthenticatedLayout';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { email: 'a@b.c', user_metadata: {} },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/useAvailableApps', () => ({
  useAvailableApps: () => ({
    data: [{ id: '1', name: 'Other', href: 'https://example.com', isActive: false }],
    isLoading: false,
  }),
}));

describe('PortalAuthenticatedLayout', () => {
  it('renders application header chrome with AppSwitcher region', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PortalAuthenticatedLayout />}>
              <Route index element={<Outlet />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Application header' })).toBeTruthy();
  });
});
