import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { err } from '@solvera/pace-core/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { MemberProfileLoadModel } from '@/hooks/member-profile/useMemberProfileData';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';
import type { MemberProfileFormValues } from '@/components/member-profile/MemberProfile/MemberProfileForm';
import { MemberProfilePage } from '@/pages/member-profile/MemberProfilePage';
import { Button } from '@solvera/pace-core/components';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

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

const saveFns = vi.hoisted(() => ({
  saveAddressesAndPhones: vi.fn().mockResolvedValue({
    residentialAddressId: 'addr-r',
    postalAddressId: 'addr-p',
  }),
  savePersonMember: vi.fn().mockResolvedValue(undefined),
}));

const testState = vi.hoisted(() => ({
  submitValues: null as MemberProfileFormValues | null,
}));

vi.mock('@/hooks/member-profile/useAddressOperations', () => ({
  useAddressOperations: () => ({ saveAddressesAndPhones: saveFns.saveAddressesAndPhones }),
}));

vi.mock('@/hooks/member-profile/usePersonOperations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/member-profile/usePersonOperations')>();
  return {
    ...actual,
    usePersonOperations: () => ({ savePersonMember: saveFns.savePersonMember }),
  };
});

vi.mock('@/integrations/google-maps/loadGoogleMapsWithPlaces', () => ({
  loadGoogleMapsWithPlaces: () =>
    Promise.resolve(
      err({
        code: 'GOOGLE_MAPS_NOT_CONFIGURED',
        message: 'Google Maps API key is not configured.',
      }),
    ),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    isProxyActive: false,
    isValidating: false,
    validationError: null,
    targetMemberId: null,
    targetPersonId: null,
    actingUserId: null,
    clearProxy: vi.fn(),
    setProxyTargetMemberId: vi.fn(),
    proxyAttribution: {},
  }),
}));

const validSubmitValues: MemberProfileFormValues = {
  first_name: 'A',
  last_name: 'B',
  middle_name: null,
  preferred_name: null,
  email: 'a@b.c',
  date_of_birth: '1990-01-01',
  gender_id: 1,
  pronoun_id: 1,
  residential: {
    line1: '1 Main St',
    locality: 'Town',
    countryCode: 'US',
    line2: undefined,
    region: undefined,
    postalCode: undefined,
    placeId: undefined,
    formattedAddress: undefined,
  },
  postal_same_as_residential: true,
  postal: null,
  membership_type_id: 1,
  membership_number: '1',
  membership_status: 'Active',
  phones: [{ phone_number: '+15555550100', phone_type_id: 1 }],
};

testState.submitValues = validSubmitValues;

vi.mock('@/components/member-profile/MemberProfile/MemberProfileForm', () => ({
  MemberProfileForm: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (v: MemberProfileFormValues) => void | Promise<void>;
    isSubmitting: boolean;
  }) => (
    <Button
      type="button"
      disabled={isSubmitting}
      onClick={() => void onSubmit(testState.submitValues ?? validSubmitValues)}
    >
      Save profile
    </Button>
  ),
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
    joined_at: '2020-01-01',
    valid_from: '2020-01-01',
    valid_to: null,
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

describe('MemberProfilePage save flow', () => {
  beforeEach(() => {
    navigate.mockClear();
    saveFns.saveAddressesAndPhones.mockClear();
    saveFns.savePersonMember.mockClear();
    hooks.memberProfile.data = loadedProfile;
    hooks.memberProfile.dataUpdatedAt = 1;
    hooks.reference.data = referenceBundle;
    testState.submitValues = validSubmitValues;
  });

  it('navigates to dashboard after successful save', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await vi.waitFor(() => {
      expect(saveFns.saveAddressesAndPhones).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(saveFns.savePersonMember).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/');
    });
  });

  it('creates a distinct postal address id when splitting a previously shared address', async () => {
    const user = userEvent.setup();
    hooks.memberProfile.data = {
      ...loadedProfile,
      person: {
        ...loadedProfile.person,
        residential_address_id: 'addr-shared',
        postal_address_id: 'addr-shared',
      },
    };
    testState.submitValues = {
      ...validSubmitValues,
      postal_same_as_residential: false,
      postal: {
        line1: '99 Postal Ave',
        locality: 'Mailtown',
        countryCode: 'US',
      },
    };

    renderPage();
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await vi.waitFor(() => {
      expect(saveFns.saveAddressesAndPhones).toHaveBeenCalledWith(
        expect.objectContaining({
          residentialId: 'addr-shared',
          postalId: null,
          postalSameAsResidential: false,
        })
      );
    });
  });
});
