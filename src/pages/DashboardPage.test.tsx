import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '@/pages/DashboardPage';

const refetch = vi.fn();
const clearProxy = vi.fn();

vi.mock('@solvera/pace-core/rbac', async () => {
  const actual = await vi.importActual<typeof import('@solvera/pace-core/rbac')>(
    '@solvera/pace-core/rbac'
  );
  return {
    ...actual,
    PagePermissionGuard: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <>{children}</>,
  };
});

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1' },
  }),
}));

vi.mock('@/shared/hooks/useEnhancedLanding', () => ({
  useEnhancedLanding: () => ({
    data: {
      needsProfileSetup: false,
      person: {
        id: 'p1',
        first_name: 'A',
        last_name: 'B',
        email: 'a@b.c',
        user_id: 'u1',
        middle_name: null,
        preferred_name: null,
        date_of_birth: null,
        address_id: null,
        created_at: null,
        created_by: null,
        deleted_at: null,
        updated_at: null,
        updated_by: null,
      },
      member: null,
      mediProfile: null,
      phones: [],
      additionalContacts: [],
      eventsByCategory: {},
      profileProgress: {
        completionRatio: 0.5,
        totalFields: 9,
        filledFields: 4,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  }),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({ clearProxy }),
}));

vi.mock('@/components/contacts/ContactSummaryCard', () => ({
  ContactSummaryCard: () => <div data-testid="contact-summary">Contact</div>,
}));

vi.mock('@/components/member-profile/ProfilePrompts', () => ({
  ProfilePrompts: () => <div data-testid="profile-prompts">Prompts</div>,
}));

vi.mock('@/components/events/EventList', () => ({
  EventList: () => <div data-testid="event-list">Events</div>,
}));

vi.mock('@/components/contacts/LinkedProfilesSection', () => ({
  LinkedProfilesSection: () => <section data-testid="linked">Linked</section>,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refetches landing data once on mount and clears proxy', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(refetch).toHaveBeenCalled();
    expect(clearProxy).toHaveBeenCalled();
    expect(screen.queryByText(/billing/i)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });
});
