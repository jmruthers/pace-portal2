import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { MemberProfileLoadModel } from '@/hooks/member-profile/useMemberProfileData';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';
import { MemberProfilePage } from '@/pages/member-profile/MemberProfilePage';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
  useSecureSupabase: () => null,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ isAuthenticated: true }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const hooks = vi.hoisted(() => ({
  memberProfile: {
    data: 'needs_setup' as MemberProfileLoadModel | 'needs_setup',
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
  },
  reference: {
    data: null as ReferenceDataBundle | null,
    isLoading: false,
  },
  proxy: {
    isProxyActive: false,
    isValidating: false,
    validationError: null as string | null,
    targetMemberId: null as string | null,
    targetPersonId: null,
    actingUserId: null,
    clearProxy: vi.fn(),
    setProxyTargetMemberId: vi.fn(),
    proxyAttribution: {},
  },
}));

vi.mock('@/hooks/member-profile/useMemberProfileData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/member-profile/useMemberProfileData')>();
  return {
    ...actual,
    useMemberProfileData: () => hooks.memberProfile,
  };
});

vi.mock('@/hooks/member-profile/useMemberAdditionalFields', () => ({
  useMemberAdditionalFields: () => hooks.reference,
}));

vi.mock('@/hooks/member-profile/useAddressOperations', () => ({
  useAddressOperations: () => ({ saveAddressesAndPhones: vi.fn() }),
}));

vi.mock('@/hooks/member-profile/usePersonOperations', () => ({
  usePersonOperations: () => ({ savePersonMember: vi.fn() }),
}));

vi.mock('@/components/member-profile/MemberProfile/MemberProfileForm', () => ({
  MemberProfileForm: () => <div data-testid="member-profile-form-stub" />,
}));

vi.mock('@/integrations/google-maps/loadGoogleMapsWithPlaces', () => ({
  loadGoogleMapsWithPlaces: () => Promise.reject(new Error('no key')),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => hooks.proxy,
}));

const referenceBundle: ReferenceDataBundle = {
  phoneTypes: [{ id: 1, name: 'Mobile', created_at: null, updated_at: null, deleted_at: null }] as never,
  membershipTypes: [
    { id: 1, name: 'Standard', created_at: null, updated_at: null, deleted_at: null },
  ] as never,
  genderTypes: [{ id: 1, name: 'F', created_at: null, updated_at: null, deleted_at: null }] as never,
  pronounTypes: [{ id: 1, name: 'She', created_at: null, updated_at: null, deleted_at: null }] as never,
};

const loadedProfile = {
  person: {
    id: 'p1',
    user_id: 'u1',
    first_name: 'A',
    last_name: 'B',
    email: 'a@b.c',
    middle_name: null,
    preferred_name: null,
    date_of_birth: '1990-01-01',
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
  member: {
    id: 'm1',
    person_id: 'p1',
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
  phones: [] as never[],
  residentialAddress: null,
  postalAddress: null,
};

function renderPage() {
  const client = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <MemberProfilePage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('MemberProfilePage', () => {
  beforeEach(() => {
    hooks.memberProfile.data = 'needs_setup';
    hooks.memberProfile.isLoading = false;
    hooks.memberProfile.isError = false;
    hooks.memberProfile.error = null;
    hooks.memberProfile.dataUpdatedAt = 0;
    hooks.reference.data = null;
    hooks.reference.isLoading = false;
    hooks.proxy.isProxyActive = false;
    hooks.proxy.isValidating = false;
    hooks.proxy.validationError = null;
    hooks.proxy.targetMemberId = null;
  });

  it('shows profile setup prompt when no person record exists', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /member profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
  });

  it('shows proxy banner when delegated context is active', () => {
    hooks.memberProfile.data = loadedProfile;
    hooks.memberProfile.dataUpdatedAt = 1;
    hooks.reference.data = referenceBundle;
    hooks.proxy.isProxyActive = true;
    hooks.proxy.targetMemberId = 'm-proxy';

    renderPage();
    expect(screen.getByText(/delegated context active/i)).toBeInTheDocument();
  });
});
