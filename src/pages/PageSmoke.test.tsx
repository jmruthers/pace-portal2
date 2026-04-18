import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err } from '@solvera/pace-core/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MemberProfilePage } from '@/pages/member-profile/MemberProfilePage';
import { MedicalProfilePage } from '@/pages/MedicalProfilePage';
import { AdditionalContactsPage } from '@/pages/AdditionalContactsPage';
import { ProfileCompletionWizardPage } from '@/pages/ProfileCompletionWizardPage';
import { ProfileViewPage } from '@/pages/member-profile/ProfileViewPage';
import { ProfileEditProxyPage } from '@/pages/member-profile/ProfileEditProxyPage';
import { FormFillPage } from '@/pages/public/FormFillPage';

vi.mock('@/hooks/auth/useProfileCompletionWizard', () => ({
  useProfileCompletionWizard: () => ({
    currentStep: 0,
    totalSteps: 3,
    stepLabels: ['Personal details', 'Contact details', 'Membership details'],
    progressValue: 33,
    isShellLoading: false,
    shellError: null,
    referenceData: {},
    personMember: null,
    person: null,
    member: null,
    phones: [],
    addressData: { residential: null, isUnresolved: true },
    mapsPreload: {
      phase: 'ready',
      result: { ok: true, data: { status: 'skipped', reason: 'no_api_key' } },
    },
    saveStatus: 'idle',
    validationMessage: null,
    eventSlug: null,
    formSlug: null,
    completionPathPreview: '/dashboard',
    saveAndContinue: vi.fn(),
    goToPrevious: vi.fn(),
    goToStep: vi.fn(),
    cancel: vi.fn(),
    completeProfile: vi.fn(),
    skipFinalStep: vi.fn(),
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
  useSecureSupabase: () => null,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: false }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useFileDisplay: () => ({ url: null as string | null, isLoading: false }),
}));

vi.mock('@/hooks/member-profile/useMemberProfileData', () => ({
  useMemberProfileData: () => ({
    data: 'needs_setup' as const,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
  }),
}));

vi.mock('@/hooks/member-profile/useMemberAdditionalFields', () => ({
  useMemberAdditionalFields: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/member-profile/useAddressOperations', () => ({
  useAddressOperations: () => ({ saveAddressesAndPhones: vi.fn() }),
}));

vi.mock('@/hooks/member-profile/usePersonOperations', () => ({
  usePersonOperations: () => ({ savePersonMember: vi.fn() }),
}));

vi.mock('@/integrations/google-maps/loadGoogleMapsWithPlaces', () => ({
  loadGoogleMapsWithPlaces: () =>
    Promise.resolve(
      err({
        code: 'GOOGLE_MAPS_NOT_CONFIGURED',
        message: 'Google Maps API key is not configured.',
      }),
    ),
}));

vi.mock('@/hooks/medical-profile/useMedicalProfilePage', () => ({
  useMedicalProfilePage: () => ({
    organisationId: 'org-1',
    userId: 'u1',
    gateReady: true,
    blockedReason: null,
    load: {
      data: {
        profile: null,
        memberId: 'm1',
        personId: 'p1',
        conditions: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
    },
    saveMedicalProfile: vi.fn(),
    isSaving: false,
    saveError: null,
  }),
}));

const proxyModeImpl = vi.hoisted(() =>
  vi.fn(() => ({
    isProxyActive: false,
    isValidating: false,
    validationError: null as string | null,
    targetMemberId: null as string | null,
    targetPersonId: null as string | null,
    actingUserId: null as string | null,
    clearProxy: vi.fn(),
    setProxyTargetMemberId: vi.fn(),
    proxyAttribution: {},
  }))
);

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxyModeImpl(),
}));

vi.mock('@/hooks/member-profile/useDelegatedProfileView', () => ({
  useDelegatedProfileView: () => ({
    data: {
      person: {
        id: 'p-view',
        user_id: 'u-other',
        first_name: 'View',
        last_name: 'User',
        email: 'v@example.com',
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
      },
      phones: [],
      member: {
        id: 'm1',
        person_id: 'p-view',
        organisation_id: 'org-1',
        membership_number: '1',
        membership_type_id: 1,
        membership_status: 'Active' as const,
        created_at: null,
        created_by: null,
        deleted_at: null,
        updated_at: null,
        updated_by: null,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/shared/hooks/useLinkedProfiles', () => ({
  useLinkedProfiles: () => ({
    data: [
      {
        person_id: 'p-view',
        member_id: 'm1',
        first_name: 'View',
        last_name: 'User',
        organisation_name: 'Org',
        permission_type: 'view',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/shared/hooks/useProxyDashboard', () => ({
  useProxyDashboard: () => ({
    data: {
      person: {
        id: 'p-edit',
        user_id: 'u-other',
        first_name: 'Edit',
        last_name: 'User',
        email: 'e@example.com',
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
      },
      phones: [],
      member: {
        id: 'm2',
        person_id: 'p-edit',
        organisation_id: 'org-1',
        membership_number: '2',
        membership_type_id: 1,
        membership_status: 'Active' as const,
        created_at: null,
        created_by: null,
        deleted_at: null,
        updated_at: null,
        updated_by: null,
      },
      mediProfile: null,
      additionalContacts: [],
      eventsByCategory: {},
      profileProgress: { completionRatio: 0.5, totalFields: 9, filledFields: 4 },
      needsProfileSetup: false,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

describe('placeholder pages', () => {
  beforeEach(() => {
    proxyModeImpl.mockImplementation(() => ({
      isProxyActive: false,
      isValidating: false,
      validationError: null,
      targetMemberId: null,
      targetPersonId: null,
      actingUserId: null,
      clearProxy: vi.fn(),
      setProxyTargetMemberId: vi.fn(),
      proxyAttribution: {},
    }));
  });

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
    const client = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <MemberProfilePage />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /member profile/i })).toBeInTheDocument();
  });

  it('renders medical profile summary shell', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MedicalProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: /medical profile/i })).toBeInTheDocument();
  });

  it('renders additional contacts placeholder', () => {
    render(
      <MemoryRouter>
        <AdditionalContactsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /additional contacts/i })).toBeInTheDocument();
  });

  it('renders profile completion wizard shell', () => {
    render(<ProfileCompletionWizardPage />);
    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
  });

  it('renders delegated profile view with member id', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/profile/view/m1']}>
          <Routes>
            <Route path="/profile/view/:memberId" element={<ProfileViewPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: /delegated profile/i })).toBeInTheDocument();
  });

  it('renders delegated profile edit with member id', () => {
    proxyModeImpl.mockImplementation(() => ({
      isProxyActive: true,
      isValidating: false,
      validationError: null,
      targetMemberId: 'm2',
      targetPersonId: 'p-edit',
      actingUserId: 'acting',
      clearProxy: vi.fn(),
      setProxyTargetMemberId: vi.fn(),
      proxyAttribution: {},
    }));
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/profile/edit/m2']}>
          <Routes>
            <Route path="/profile/edit/:memberId" element={<ProfileEditProxyPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: /delegated workspace/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login with return URL (PR01 handoff)', async () => {
    const { MemoryRouter } = await import('react-router-dom');
    render(
      <MemoryRouter initialEntries={['/evt/frm']}>
        <FormFillPage eventSlug="evt" formSlug="frm" />
      </MemoryRouter>
    );
    expect(await screen.findByText(/redirecting to sign in/i)).toBeInTheDocument();
  });
});
