import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyMembershipsPage } from '@/pages/memberships/MyMembershipsPage';

const listState = vi.hoisted(() => ({
  items: [] as Array<{
    memberId: string;
    organisationId: string;
    organisationName: string;
    membershipStatus: string;
    membershipTypeId: number | null;
    membershipTypeName: string | null;
    membershipNumber: string | null;
    requestId: string | null;
    requestStatus: string | null;
    requestSubmittedAt: string | null;
    displayKind: string;
    displayLabel: string;
    showApplyAgain: boolean;
  }>,
  isLoading: false,
  isError: false,
  errorMessage: null as string | null,
}));

const flowState = vi.hoisted(() => ({
  flowStep: 'idle' as string,
  startFlow: vi.fn(),
  cancelFlow: vi.fn(),
}));

vi.mock('@/hooks/memberships/useMembershipList', () => ({
  useMembershipList: () => ({
    ...listState,
    refetch: vi.fn(),
    upsertListItem: vi.fn(),
  }),
}));

vi.mock('@/hooks/memberships/useMemberRequestFlow', () => ({
  useMemberRequestFlow: () => ({
    flowStep: flowState.flowStep,
    requestType: 'join',
    setRequestType: vi.fn(),
    orgSearchQuery: '',
    setOrgSearchQuery: vi.fn(),
    orgSearchResults: [],
    orgSearchLoading: false,
    orgSearchError: null,
    selectedOrg: null,
    selectOrg: vi.fn(),
    sourceOrgId: null,
    setSourceOrgId: vi.fn(),
    membershipTypes: [],
    eligibleMembershipTypes: [],
    selectedMembershipTypeId: null,
    setSelectedMembershipTypeId: vi.fn(),
    orgSignupForm: null,
    orgFormLoading: false,
    preSubmitError: null,
    preSubmitCode: null,
    submitError: null,
    submitPending: false,
    confirmationOrgName: null,
    startFlow: flowState.startFlow,
    cancelFlow: flowState.cancelFlow,
    goNext: vi.fn(),
    goBack: vi.fn(),
    submitRequest: vi.fn(),
    activeSourceMemberships: [],
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
  useSecureSupabase: () => null,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: true, user: { id: 'u1' }, supabase: null }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MyMembershipsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MyMembershipsPage', () => {
  beforeEach(() => {
    listState.items = [];
    listState.isLoading = false;
    listState.isError = false;
    flowState.flowStep = 'idle';
    flowState.startFlow.mockClear();
  });

  it('shows empty state and Add Organisation CTA', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /my memberships/i })).toBeInTheDocument();
    expect(
      screen.getByText(/not yet a member of any organisations/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add organisation/i })).toHaveLength(1);
  });

  it('starts join flow from empty state CTA', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /add organisation/i }));
    expect(flowState.startFlow).toHaveBeenCalled();
  });

  it('renders membership card from list', () => {
    listState.items = [
      {
        memberId: 'm1',
        organisationId: 'org-a',
        organisationName: 'Org A',
        membershipStatus: 'Active',
        membershipTypeId: 1,
        membershipTypeName: 'Member',
        membershipNumber: '100',
        requestId: null,
        requestStatus: null,
        requestSubmittedAt: null,
        displayKind: 'active',
        displayLabel: 'Active',
        showApplyAgain: false,
      },
    ];
    renderPage();
    expect(screen.getByText('Org A')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
