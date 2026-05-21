import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok } from '@solvera/pace-core/types';
import {
  useEffectiveMedicalMemberId,
  useMedicalProfilePage,
} from '@/hooks/medical-profile/useMedicalProfilePage';
import * as supabaseTyped from '@/lib/supabase-typed';
import * as medicalModule from '@/hooks/medical-profile/useMedicalProfileData';

const memberData = vi.hoisted(() => {
  const completeSelfProfile = () => ({
    member: { id: 'self-m', membership_type_id: 1, membership_number: 'M1' },
    person: {
      id: 'p1',
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.c',
      date_of_birth: '2000-01-01',
      preferred_name: null,
      gender_id: 2,
      pronoun_id: 3,
    },
  });
  return {
  data: completeSelfProfile() as unknown,
  isLoading: false,
  isPending: false,
  isFetching: false,
  isError: false,
  completeSelfProfile,
  };
});

const proxy = vi.hoisted(() => ({
  isProxyActive: false,
  isValidating: false,
  validationError: null as string | null,
  targetMemberId: null as string | null,
}));

const orgState = vi.hoisted(() => ({
  id: 'org-1' as string | null,
  isLoading: false,
}));

const secureState = vi.hoisted(() => ({
  client: {} as object | null,
}));

const authState = vi.hoisted(() => ({
  userId: 'user-1' as string | null,
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: authState.userId ? { id: authState.userId } : null }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () =>
    orgState.id
      ? { selectedOrganisation: { id: orgState.id }, isLoading: orgState.isLoading }
      : null,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => secureState.client,
}));

vi.mock('@/lib/supabase-typed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase-typed')>();
  return {
    ...actual,
    toTypedSupabase: (client: unknown) => (client == null ? null : ({} as never)),
  };
});

vi.mock('@/hooks/member-profile/useMemberProfileData', () => ({
  useMemberProfileData: () => memberData,
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    isProxyActive: proxy.isProxyActive,
    isValidating: proxy.isValidating,
    validationError: proxy.validationError,
    targetMemberId: proxy.targetMemberId,
  }),
}));

vi.mock('@/shared/hooks/useResolvedAppId', () => ({
  useResolvedAppId: () => 'app-test-id',
}));

vi.mock('@/hooks/medical-profile/useMedicalProfileData', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/medical-profile/useMedicalProfileData')>(
    '@/hooks/medical-profile/useMedicalProfileData'
  );
  return {
    ...actual,
    useMedicalProfileData: vi.fn(() => ({
      data: null,
      isLoading: false,
      isError: false,
    })),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEffectiveMedicalMemberId', () => {
  beforeEach(() => {
    authState.userId = 'user-1';
    orgState.id = 'org-1';
    orgState.isLoading = false;
    secureState.client = {};
    memberData.data = memberData.completeSelfProfile();
    memberData.isLoading = false;
    memberData.isPending = false;
    memberData.isFetching = false;
    memberData.isError = false;
    proxy.isProxyActive = false;
    proxy.isValidating = false;
    proxy.validationError = null;
    proxy.targetMemberId = null;
  });

  it('returns no_organisation when org is missing', () => {
    orgState.id = null;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.effectiveMemberId).toBeNull();
    expect(result.current.isReady).toBe(true);
    expect(result.current.blockedReason).toBe('no_organisation');
  });

  it('waits while member profile is loading', () => {
    memberData.isLoading = true;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.effectiveMemberId).toBeNull();
  });

  it('waits while member profile query is pending without isLoading (disabled-query race)', () => {
    memberData.data = undefined;
    memberData.isLoading = false;
    memberData.isPending = true;
    memberData.isFetching = false;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.blockedReason).toBeNull();
  });

  it('waits while secure client is not ready', () => {
    secureState.client = null;
    memberData.data = undefined;
    memberData.isPending = true;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.blockedReason).toBeNull();
  });

  it('waits while organisation context is loading', () => {
    orgState.isLoading = true;
    memberData.data = undefined;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.isReady).toBe(false);
    expect(result.current.blockedReason).toBeNull();
  });

  it('blocks when member data errors', () => {
    memberData.isError = true;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.blockedReason).toBe('needs_member_profile');
  });

  it('blocks when member profile needs setup', () => {
    memberData.data = 'needs_setup';

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.blockedReason).toBe('needs_member_profile');
  });

  it('waits while proxy is validating', () => {
    proxy.isProxyActive = false;
    proxy.isValidating = true;
    proxy.targetMemberId = 'm-proxy';

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.isReady).toBe(false);
  });

  it('returns self member id when not in proxy mode', () => {
    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });
    expect(result.current.effectiveMemberId).toBe('self-m');
    expect(result.current.isReady).toBe(true);
    expect(result.current.blockedReason).toBeNull();
  });

  it('returns proxy target when proxy is active and valid', () => {
    proxy.isProxyActive = true;
    proxy.targetMemberId = 'proxy-m';
    proxy.isValidating = false;
    proxy.validationError = null;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.effectiveMemberId).toBe('proxy-m');
    expect(result.current.blockedReason).toBeNull();
  });

  it('blocks when proxy is invalid', () => {
    proxy.isProxyActive = false;
    proxy.validationError = 'denied';
    proxy.targetMemberId = 'm-proxy';

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.effectiveMemberId).toBeNull();
    expect(result.current.blockedReason).toBe('proxy_invalid');
  });

  it('falls back to self member when proxy is active without target id (inconsistent mock state)', () => {
    proxy.isProxyActive = true;
    proxy.validationError = null;
    proxy.targetMemberId = null;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.effectiveMemberId).toBe('self-m');
    expect(result.current.blockedReason).toBeNull();
  });

  it('uses proxy target when delegate themselves have no member profile row', () => {
    memberData.data = 'needs_setup';
    proxy.isProxyActive = true;
    proxy.targetMemberId = 'proxy-m';
    proxy.isValidating = false;
    proxy.validationError = null;

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.effectiveMemberId).toBe('proxy-m');
    expect(result.current.blockedReason).toBeNull();
  });

  it('blocks when user id missing for self path', () => {
    authState.userId = null;
    memberData.data = memberData.completeSelfProfile();

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.blockedReason).toBe('needs_member_profile');
  });

  it('blocks when profile is below completeness threshold', () => {
    memberData.data = {
      member: { id: 'self-m', membership_type_id: null, membership_number: null },
      person: {
        id: 'p1',
        first_name: '',
        last_name: '',
        email: '',
        date_of_birth: '',
        preferred_name: null,
        gender_id: 0,
        pronoun_id: 0,
      },
    };

    const { result } = renderHook(() => useEffectiveMedicalMemberId(), { wrapper });

    expect(result.current.blockedReason).toBe('needs_member_profile');
  });
});

describe('useMedicalProfilePage save', () => {
  beforeEach(() => {
    authState.userId = 'user-1';
    orgState.id = 'org-1';
    orgState.isLoading = false;
    secureState.client = {};
    memberData.data = memberData.completeSelfProfile();
    memberData.isLoading = false;
    memberData.isPending = false;
    memberData.isFetching = false;
    memberData.isError = false;
    proxy.isProxyActive = false;
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ rpc: vi.fn(), from: vi.fn() } as never);
    vi.spyOn(medicalModule, 'fetchMedicalProfileData').mockReset();
  });

  it('throws when menu selection is empty', async () => {
    const { result } = renderHook(() => useMedicalProfilePage(), { wrapper });

    await expect(
      result.current.saveMedicalProfile({
        medicare_number: '',
        medicare_expiry: '',
        health_care_card_number: '',
        health_care_card_expiry: '',
        health_fund_name: '',
        health_fund_number: '',
        dietary_comments: '',
        menu_selection: '   ',
        is_fully_immunised: false,
        last_tetanus_date: '',
      })
    ).rejects.toThrow(/select a menu/i);
  });

  it('calls rpc when profile exists', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ rpc, from: vi.fn() } as never);

    vi.spyOn(medicalModule, 'fetchMedicalProfileData').mockResolvedValue(
      ok({
        profile: { id: 'prof-1' } as never,
        personId: 'p1',
        memberId: 'self-m',
        conditions: [],
        dietTypeNameFromRpc: null,
      })
    );

    const { result } = renderHook(() => useMedicalProfilePage(), { wrapper });

    await result.current.saveMedicalProfile({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: '',
      menu_selection: 'd1',
      is_fully_immunised: false,
      last_tetanus_date: '',
    });

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('app_medi_profile_update', expect.any(Object));
    });
  });

  it('inserts medi_profile row when none exists', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'new-prof' }, error: null });
    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    const from = vi.fn(() => ({
      insert: insertFn,
    }));
    const rpc = vi.fn();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ rpc, from } as never);

    vi.spyOn(medicalModule, 'fetchMedicalProfileData').mockResolvedValue(
      ok({
        profile: null,
        personId: 'p1',
        memberId: 'self-m',
        conditions: [],
        dietTypeNameFromRpc: null,
      })
    );

    const { result } = renderHook(() => useMedicalProfilePage(), { wrapper });

    await result.current.saveMedicalProfile({
      medicare_number: '',
      medicare_expiry: '',
      health_care_card_number: '',
      health_care_card_expiry: '',
      health_fund_name: '',
      health_fund_number: '',
      dietary_comments: '',
      menu_selection: 'd1',
      is_fully_immunised: false,
      last_tetanus_date: '',
    });

    await waitFor(() => {
      expect(insertFn).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
