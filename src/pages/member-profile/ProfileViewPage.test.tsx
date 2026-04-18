import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfileViewPage } from '@/pages/member-profile/ProfileViewPage';

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
  useUnifiedAuthContext: () => ({ appId: 'app-1' }),
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
          <Route path="/profile/view" element={<ProfileViewPage />} />
          <Route path="/profile/view/:memberId" element={<ProfileViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProfileViewPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    guardState.phase = 'ready';
    orgState.selectedOrganisation = { id: 'org-1' };
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

  it('shows permission guard loading state', async () => {
    guardState.phase = 'loading';

    renderView('/profile/view/m1');

    expect(await screen.findByLabelText(/checking access/i)).toBeInTheDocument();
  });

  it('shows access denied fallback when guard denies', async () => {
    guardState.phase = 'denied';

    renderView('/profile/view/m1');

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  it('hides edit when linked profiles list is empty', async () => {
    delegated.data = {
      person: personRow,
      phones: [],
      member: { id: 'm1', person_id: 'p1', organisation_id: 'org-1' } as never,
    };
    linked.data = [];

    renderView('/profile/view/m1');

    expect(await screen.findByRole('heading', { name: /delegated profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit on their behalf/i })).not.toBeInTheDocument();
  });

  it('hides edit when linked list has no row for this member', async () => {
    delegated.data = {
      person: personRow,
      phones: [],
      member: { id: 'm1', person_id: 'p1', organisation_id: 'org-1' } as never,
    };
    linked.data = [
      {
        person_id: 'p2',
        member_id: 'm2',
        first_name: 'Other',
        last_name: 'Person',
        organisation_name: 'Org',
        permission_type: 'admin',
      },
    ];

    renderView('/profile/view/m1');

    expect(await screen.findByRole('heading', { name: /delegated profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit on their behalf/i })).not.toBeInTheDocument();
  });

  it('requires organisation selection before viewing', async () => {
    orgState.selectedOrganisation = null;

    renderView('/profile/view/m1');

    expect(await screen.findByText(/organisation required/i)).toBeInTheDocument();
  });

  it('shows invalid link when member id route param is missing', async () => {
    renderView('/profile/view');

    expect(await screen.findByText(/missing member id/i)).toBeInTheDocument();
  });

  it('shows loading state while delegated profile loads', async () => {
    delegated.isLoading = true;

    renderView('/profile/view/m1');

    expect(screen.getByLabelText(/loading profile/i)).toBeInTheDocument();
  });

  it('renders nothing when query succeeds but returns no data', async () => {
    delegated.isLoading = false;
    delegated.isError = false;
    delegated.data = null;

    renderView('/profile/view/m1');

    await vi.waitFor(() => {
      expect(screen.queryByRole('heading', { name: /delegated profile/i })).not.toBeInTheDocument();
    });
  });

  it('shows access denied when delegated load fails', async () => {
    delegated.isError = true;
    delegated.error = new Error('Delegated access was denied.');

    renderView('/profile/view/m1');

    expect(await screen.findByText(/delegated access was denied/i)).toBeInTheDocument();
  });

  it('shows generic access message when error is not an Error instance', async () => {
    delegated.isError = true;
    delegated.error = 'blocked' as unknown as Error;

    renderView('/profile/view/m1');

    expect(await screen.findByText(/you cannot view this profile/i)).toBeInTheDocument();
  });

  it('navigates home from error state', async () => {
    const user = userEvent.setup();
    delegated.isError = true;
    delegated.error = new Error('Denied');

    renderView('/profile/view/m1');

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('navigates to delegated edit when edit is clicked', async () => {
    const user = userEvent.setup();
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

    await user.click(await screen.findByRole('button', { name: /edit on their behalf/i }));
    expect(navigateMock).toHaveBeenCalledWith('/profile/edit/m1');
  });

  it('navigates home from success state', async () => {
    const user = userEvent.setup();
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

    await user.click(await screen.findByRole('button', { name: /back to dashboard/i }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
