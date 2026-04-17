import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfileViewPage } from '@/pages/member-profile/ProfileViewPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ appId: 'app-1' }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useFileDisplay: () => ({ url: null, isLoading: false }),
}));

vi.mock('@/components/member-profile/ProfilePhotoUpload', () => ({
  ProfilePhotoUpload: () => <div data-testid="photo-upload" />,
}));

const delegated = vi.hoisted(() => ({
  data: null as {
    person: Record<string, unknown>;
    phones: unknown[];
    member: Record<string, unknown>;
  } | null,
  isLoading: false,
  isError: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/member-profile/useDelegatedProfileView', () => ({
  useDelegatedProfileView: () => delegated,
}));

const linked = vi.hoisted(() => ({
  data: [] as Array<{
    person_id: string;
    member_id?: string;
    first_name: string;
    last_name: string;
    organisation_name: string;
    permission_type: string;
  }>,
}));

vi.mock('@/shared/hooks/useLinkedProfiles', () => ({
  useLinkedProfiles: () => ({ data: linked.data, isLoading: false, error: null }),
}));

const personRow = {
  id: 'p1',
  user_id: 'u2',
  first_name: 'Sam',
  last_name: 'Lee',
  email: 'sam@example.com',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
  gender_id: 1,
  pronoun_id: 1,
  residential_address_id: null,
  postal_address_id: null,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

function renderView(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/profile/view/:memberId" element={<ProfileViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProfileViewPage', () => {
  beforeEach(() => {
    delegated.data = null;
    delegated.isLoading = false;
    delegated.isError = false;
    delegated.error = null;
    linked.data = [];
  });

  it('shows read-only contact summary without photo upload', async () => {
    delegated.isLoading = false;
    delegated.data = {
      person: personRow,
      phones: [],
      member: { id: 'm1', person_id: 'p1', organisation_id: 'org-1' } as never,
    };
    linked.data = [
      {
        person_id: 'p1',
        member_id: 'm1',
        first_name: 'Sam',
        last_name: 'Lee',
        organisation_name: 'Org',
        permission_type: 'view',
      },
    ];

    renderView('/profile/view/m1');

    expect(await screen.findByRole('heading', { name: /delegated profile/i })).toBeInTheDocument();
    expect(screen.queryByTestId('photo-upload')).not.toBeInTheDocument();
    expect(screen.getByText(/Sam Lee/)).toBeInTheDocument();
  });

  it('shows edit affordance when linked profile permission allows edit', async () => {
    delegated.data = {
      person: personRow,
      phones: [],
      member: { id: 'm1', person_id: 'p1', organisation_id: 'org-1' } as never,
    };
    linked.data = [
      {
        person_id: 'p1',
        member_id: 'm1',
        first_name: 'Sam',
        last_name: 'Lee',
        organisation_name: 'Org',
        permission_type: 'admin',
      },
    ];

    renderView('/profile/view/m1');

    expect(await screen.findByRole('button', { name: /edit on their behalf/i })).toBeInTheDocument();
  });

  it('hides edit affordance for view-only permission', async () => {
    delegated.data = {
      person: personRow,
      phones: [],
      member: { id: 'm1', person_id: 'p1', organisation_id: 'org-1' } as never,
    };
    linked.data = [
      {
        person_id: 'p1',
        member_id: 'm1',
        first_name: 'Sam',
        last_name: 'Lee',
        organisation_name: 'Org',
        permission_type: 'view',
      },
    ];

    renderView('/profile/view/m1');

    expect(await screen.findByRole('heading', { name: /delegated profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit on their behalf/i })).not.toBeInTheDocument();
  });

  it('shows access denied when delegated load fails', async () => {
    delegated.isError = true;
    delegated.error = new Error('Delegated access was denied.');

    renderView('/profile/view/m1');

    expect(await screen.findByText(/delegated access was denied/i)).toBeInTheDocument();
  });
});
