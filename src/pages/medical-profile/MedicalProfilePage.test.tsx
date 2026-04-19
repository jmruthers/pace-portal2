import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MedicalProfilePage } from '@/pages/medical-profile/MedicalProfilePage';

const mockNavigate = vi.fn();

const mockDietTypes = [
  {
    diettype_id: '1',
    diettype_code: 'ST',
    diettype_name: 'Standard',
    diettype_description: 'Nut free',
  },
];

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
  useSecureSupabase: () => null,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/medical-profile/useMedicalReferenceData', () => ({
  useMedicalReferenceData: () => ({
    dietTypes: mockDietTypes,
    dietTypesLoading: false,
    dietTypesError: null,
    dietTypesIsError: false,
  }),
}));

const editor = vi.hoisted(() =>
  vi.fn(() => ({
    organisationId: 'org-1',
    userId: 'u1',
    gateReady: true,
    blockedReason: null as 'needs_member_profile' | 'proxy_invalid' | 'no_organisation' | null,
    load: {
      data: {
        profile: {
          id: 'mp1',
          person_id: 'p1',
          created_at: null,
          created_by: null,
          data_retention_until: null,
          diet_type_id: '1',
          dietary_comments: null,
          health_care_card_expiry: null,
          health_care_card_number: null,
          health_fund_name: null,
          health_fund_number: null,
          is_fully_immunised: false,
          last_tetanus_date: null,
          medicare_expiry: null,
          medicare_number: null,
          requires_support: false,
          support_details: null,
          updated_at: null,
          updated_by: null,
        },
        memberId: 'm1',
        personId: 'p1',
        conditions: [
          {
            id: 'c1',
            name: 'Asthma',
            custom_name: null,
            severity: 'High',
            medical_alert: true,
            is_active: true,
          },
        ],
        dietTypeNameFromRpc: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
    },
    saveMedicalProfile: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
    saveError: null,
  }))
);

vi.mock('@/hooks/medical-profile/useMedicalProfilePage', () => ({
  useMedicalProfilePage: () => editor(),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    isProxyActive: false,
    isValidating: false,
    validationError: null,
    targetMemberId: null,
    targetPersonId: null,
    actingUserId: 'u1',
    clearProxy: vi.fn(),
    setProxyTargetMemberId: vi.fn(),
    proxyAttribution: {},
  }),
}));

describe('MedicalProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editor.mockImplementation(() => ({
      organisationId: 'org-1',
      userId: 'u1',
      gateReady: true,
      blockedReason: null,
      load: {
        data: {
          profile: {
            id: 'mp1',
            person_id: 'p1',
            created_at: null,
            created_by: null,
            data_retention_until: null,
            diet_type_id: '1',
            dietary_comments: null,
            health_care_card_expiry: null,
            health_care_card_number: null,
            health_fund_name: null,
            health_fund_number: null,
            is_fully_immunised: false,
            last_tetanus_date: null,
            medicare_expiry: null,
            medicare_number: null,
            requires_support: false,
            support_details: null,
            updated_at: null,
            updated_by: null,
          },
          memberId: 'm1',
          personId: 'p1',
          conditions: [
            {
              id: 'c1',
              name: 'Asthma',
              custom_name: null,
              severity: 'High',
              medical_alert: true,
              is_active: true,
            },
          ],
          dietTypeNameFromRpc: null,
        },
        isLoading: false,
        isError: false,
        error: null,
        dataUpdatedAt: 0,
      },
      saveMedicalProfile: vi.fn().mockResolvedValue(undefined),
      isSaving: false,
      saveError: null,
    }));
  });

  it('renders summary heading and recorded conditions handoff', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: /medical profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Asthma/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add condition/i })).not.toBeInTheDocument();
  });

  it('redirects to member profile when member profile is incomplete', async () => {
    editor.mockImplementation(() => ({
      organisationId: 'org-1',
      userId: 'u1',
      gateReady: true,
      blockedReason: 'needs_member_profile',
      load: {
        data: {
          profile: null,
          dietTypeNameFromRpc: null,
          memberId: 'm1',
          personId: 'p1',
          conditions: [],
        } as never,
        isLoading: false,
        isError: false,
        error: null,
        dataUpdatedAt: 0,
      },
      saveMedicalProfile: vi.fn(),
      isSaving: false,
      saveError: null,
    }));

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
    const call = mockNavigate.mock.calls[0];
    expect(String(call[0])).toMatch(/member-profile/);
  });

  it('submits save from bottom save button', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    editor.mockImplementation(() => ({
      organisationId: 'org-1',
      userId: 'u1',
      gateReady: true,
      blockedReason: null,
      load: {
        data: {
          profile: {
            id: 'mp1',
            person_id: 'p1',
            created_at: null,
            created_by: null,
            data_retention_until: null,
            diet_type_id: '1',
            dietary_comments: null,
            health_care_card_expiry: null,
            health_care_card_number: null,
            health_fund_name: null,
            health_fund_number: null,
            is_fully_immunised: false,
            last_tetanus_date: null,
            medicare_expiry: null,
            medicare_number: null,
            requires_support: false,
            support_details: null,
            updated_at: null,
            updated_by: null,
          },
          memberId: 'm1',
          personId: 'p1',
          conditions: [],
          dietTypeNameFromRpc: null,
        },
        isLoading: false,
        isError: false,
        error: null,
        dataUpdatedAt: 0,
      },
      saveMedicalProfile: save,
      isSaving: false,
      saveError: null,
    }));

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const buttons = screen.getAllByRole('button', { name: /save medical profile/i });
    await user.click(buttons[buttons.length - 1]!);
    await waitFor(() => expect(save).toHaveBeenCalled());
  });
});
