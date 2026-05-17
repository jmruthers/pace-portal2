import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrgFormRoute } from '@/pages/forms/OrgFormRoutes';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
}));

vi.mock('@/components/form-journey/FormJourneyShell', () => ({
  FormJourneyShell: ({ entrypoint }: { entrypoint: { kind: string; formSlug?: string } }) => (
    <div data-testid="journey">{entrypoint.kind}:{entrypoint.formSlug ?? ''}</div>
  ),
}));

describe('OrgFormRoute', () => {
  it('renders FormJourneyShell for /forms/:formSlug', async () => {
    render(
      <MemoryRouter initialEntries={['/forms/staff-onboarding']}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="forms/:formSlug" element={<OrgFormRoute />} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('journey')).toHaveTextContent('org_form:staff-onboarding');
  });
});
