import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MemberProfilePage } from '@/pages/MemberProfilePage';
import { MedicalProfilePage } from '@/pages/MedicalProfilePage';
import { AdditionalContactsPage } from '@/pages/AdditionalContactsPage';
import { ProfileCompletionWizardPage } from '@/pages/ProfileCompletionWizardPage';
import { ProfileViewPage } from '@/pages/ProfileViewPage';
import { ProfileEditProxyPage } from '@/pages/ProfileEditProxyPage';
import { FormFillPage } from '@/pages/public/FormFillPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: false }),
}));

describe('placeholder pages', () => {
  it('renders not-found with home link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/');
  });

  it('renders member profile placeholder', () => {
    render(<MemberProfilePage />);
    expect(screen.getByRole('heading', { name: /member profile/i })).toBeInTheDocument();
  });

  it('renders medical profile placeholder', () => {
    render(<MedicalProfilePage />);
    expect(screen.getByRole('heading', { name: /medical profile/i })).toBeInTheDocument();
  });

  it('renders additional contacts placeholder', () => {
    render(<AdditionalContactsPage />);
    expect(screen.getByRole('heading', { name: /additional contacts/i })).toBeInTheDocument();
  });

  it('renders profile completion placeholder', () => {
    render(<ProfileCompletionWizardPage />);
    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
  });

  it('renders delegated profile view with member id', () => {
    render(
      <MemoryRouter initialEntries={['/profile/view/m1']}>
        <Routes>
          <Route path="/profile/view/:memberId" element={<ProfileViewPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Member: m1/)).toBeInTheDocument();
  });

  it('renders delegated profile edit with member id', () => {
    render(
      <MemoryRouter initialEntries={['/profile/edit/m2']}>
        <Routes>
          <Route path="/profile/edit/:memberId" element={<ProfileEditProxyPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Member: m2/)).toBeInTheDocument();
  });

  it('renders public form fill branch when unauthenticated', () => {
    render(<FormFillPage eventSlug="evt" formSlug="frm" />);
    expect(screen.getByRole('heading', { name: /event form/i })).toBeInTheDocument();
    expect(screen.getByText(/public landing/i)).toBeInTheDocument();
  });
});
