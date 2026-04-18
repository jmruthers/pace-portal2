import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { err, ok } from '@solvera/pace-core/types';
import { useProfileCompletionWizard } from '@/hooks/auth/useProfileCompletionWizard';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/hooks/useEnhancedLanding';
import * as userUtils from '@/shared/lib/utils/userUtils';
import { validateMemberProfileWizardStep } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';

const mockNavigate = vi.fn();

const persistMocks = vi.hoisted(() => ({
  s0: vi.fn(),
  s1: vi.fn(),
  s2: vi.fn(),
}));

vi.mock('@/hooks/auth/profileWizardPersistence', () => ({
  persistProfileWizardStep0: persistMocks.s0,
  persistProfileWizardStep1: persistMocks.s1,
  persistProfileWizardStep2: persistMocks.s2,
}));

vi.mock('@/components/member-profile/MemberProfile/memberProfileWizardSchema', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/member-profile/MemberProfile/memberProfileWizardSchema')
  >('@/components/member-profile/MemberProfile/memberProfileWizardSchema');
  return {
    ...actual,
    validateMemberProfileWizardStep: vi.fn(() => ({ ok: true as const })),
  };
});

vi.mock('@/hooks/auth/profileWizardShell', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/auth/profileWizardShell')>(
    '@/hooks/auth/profileWizardShell'
  );
  return {
    ...actual,
    validateShellStep: vi.fn(() => ({ ok: true as const })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@solvera/pace-core/components', async () => {
  const actual = await vi.importActual<typeof import('@solvera/pace-core/components')>(
    '@solvera/pace-core/components'
  );
  return {
    ...actual,
    toast: vi.fn(),
  };
});

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/shared/hooks/useReferenceData', () => ({
  useReferenceData: () => ({
    data: { phoneTypes: [], membershipTypes: [], genderTypes: [], pronounTypes: [] },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/contacts/usePhoneNumbers', () => ({
  usePhoneNumbers: () => ({
    data: [{ id: 'ph1', phone_number: '0400 000 000' }],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/hooks/shared/useAddressData', () => ({
  usePersonAddresses: () => ({
    isLoading: false,
    isError: false,
    error: null,
    addressData: {
      residential: {
        id: 'addr-1',
        full_address: '1 Test St',
        place_id: 'place',
        updated_at: null,
      } as never,
      postal: null,
      isUnresolved: false,
    },
  }),
}));

vi.mock('@/integrations/google-maps/loader', () => ({
  loadGoogleMapsWithPlaces: vi
    .fn()
    .mockResolvedValue({ ok: true, data: { status: 'skipped', reason: 'no_api_key' } }),
}));

const personRow = {
  id: 'p1',
  user_id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
  gender_id: 1,
  pronoun_id: 1,
  residential_address_id: 'addr-1',
  postal_address_id: null,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

vi.mock('@/shared/lib/utils/userUtils', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/utils/userUtils')>(
    '@/shared/lib/utils/userUtils'
  );
  return {
    ...actual,
    fetchCurrentPersonMember: vi.fn(),
    bustCurrentPersonMemberCache: vi.fn(),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/profile-complete?eventSlug=evt&formSlug=frm']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useProfileCompletionWizard workflow', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    persistMocks.s0.mockClear();
    persistMocks.s1.mockClear();
    persistMocks.s2.mockClear();
    persistMocks.s0.mockResolvedValue({ memberId: 'm1' });
    persistMocks.s1.mockResolvedValue(undefined);
    persistMocks.s2.mockResolvedValue(undefined);
    vi.mocked(validateMemberProfileWizardStep).mockReturnValue({ ok: true });
    vi.mocked(userUtils.fetchCurrentPersonMember).mockResolvedValue(
      ok({
        person: personRow,
        member: {
          id: 'm1',
          person_id: 'p1',
          organisation_id: 'org-1',
          membership_number: 'N1',
          membership_type_id: 1,
          membership_status: 'Active',
          created_at: null,
          created_by: null,
          deleted_at: null,
          updated_at: null,
          updated_by: null,
        } as never,
        usedReducedFieldFallback: false,
      })
    );
  });

  it('advances through steps and persists each segment', async () => {
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.form.getValues().first_name).toBe('Ada');
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });
    await waitFor(() => {
      expect(persistMocks.s0).toHaveBeenCalled();
      expect(result.current.currentStep).toBe(1);
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });
    await waitFor(() => {
      expect(persistMocks.s1).toHaveBeenCalled();
      expect(result.current.currentStep).toBe(2);
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });
    await waitFor(() => {
      expect(persistMocks.s2).toHaveBeenCalled();
    });
  });

  it('goes back and only allows goToStep to already completed steps', async () => {
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.form.getValues().first_name).toBe('Ada');
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });
    await waitFor(() => {
      expect(result.current.currentStep).toBe(1);
    });

    act(() => {
      result.current.goToPrevious();
    });
    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.goToStep(1);
    });
    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.goToStep(0);
    });
    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.goToStep(5);
    });
    expect(result.current.currentStep).toBe(0);
  });

  it('finalizes wizard and navigates after delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });
    await act(async () => {
      await result.current.saveAndContinue();
    });

    await act(async () => {
      const p = result.current.completeProfile();
      await vi.runAllTimersAsync();
      await p;
    });

    expect(mockNavigate).toHaveBeenCalledWith('/evt/frm?fromWizard=true', { replace: false });
    vi.useRealTimers();
  });

  it('skipFinalStep navigates without persisting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    await act(async () => {
      const p = result.current.skipFinalStep();
      await vi.runAllTimersAsync();
      await p;
    });

    expect(mockNavigate).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('sets save error when persistence throws', async () => {
    persistMocks.s0.mockRejectedValueOnce(new Error('database unavailable'));

    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.form.getValues().first_name).toBe('Ada');
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });

    expect(result.current.saveStatus).toBe('error');
    expect(result.current.saveErrorMessage).toMatch(/database unavailable/i);
  });

  it('does not persist when personal validation fails', async () => {
    vi.mocked(validateMemberProfileWizardStep).mockReturnValueOnce({
      ok: false,
      message: 'Invalid',
      issues: [{ path: 'first_name', message: 'Required' }],
    });

    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveAndContinue();
    });

    expect(persistMocks.s0).not.toHaveBeenCalled();
  });

  it('handles NO_PERSON profile as empty shell', async () => {
    vi.mocked(userUtils.fetchCurrentPersonMember).mockResolvedValue(
      err({ code: NO_PERSON_PROFILE_ERROR_CODE, message: 'none' })
    );

    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    expect(result.current.personMember).toBeNull();
  });

  it('surfaces person member load errors', async () => {
    vi.mocked(userUtils.fetchCurrentPersonMember).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.shellError).toBeTruthy();
    });
  });
});
