import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { err } from '@solvera/pace-core/types';
import * as userUtils from '@/shared/lib/utils/userUtils';
import {
  fetchDelegatedMemberProfileLoadModel,
  mapLoadModelToFormValues,
  useMemberProfileData,
} from '@/hooks/member-profile/useMemberProfileData';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'o1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({ from: vi.fn() }),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

const proxyState = vi.hoisted(() => ({
  isProxyActive: false,
  isValidating: false,
  validationError: null as string | null,
  targetMemberId: null as string | null,
  targetPersonId: null as string | null,
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    isProxyActive: proxyState.isProxyActive,
    isValidating: proxyState.isValidating,
    validationError: proxyState.validationError,
    targetMemberId: proxyState.targetMemberId,
    targetPersonId: proxyState.targetPersonId,
    setProxyTargetMemberId: vi.fn(),
    clearProxy: vi.fn(),
  }),
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useMemberProfileData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    proxyState.isProxyActive = false;
    proxyState.isValidating = false;
    proxyState.validationError = null;
    proxyState.targetMemberId = null;
    proxyState.targetPersonId = null;
  });

  it('returns needs_setup when person is missing', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({
        code: userUtils.NO_PERSON_PROFILE_ERROR_CODE,
        message: 'Could not load profile.',
      })
    );
    const qc = new QueryClient();
    const { result } = renderHook(() => useMemberProfileData(), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBe('needs_setup');
  });

  it('does not fetch self profile while delegated session is validating', async () => {
    const fetchSpy = vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({ code: 'OTHER', message: 'no' })
    );
    proxyState.targetMemberId = 'm-delegated';
    proxyState.isValidating = true;
    proxyState.isProxyActive = false;

    const qc = new QueryClient();
    const { result } = renderHook(() => useMemberProfileData(), {
      wrapper: wrapper(qc),
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});

describe('fetchDelegatedMemberProfileLoadModel', () => {
  it('returns load model when access RPC and selects succeed', async () => {

    const secure = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const memberRow = {
      id: 'm1',
      person_id: 'p1',
      organisation_id: 'o1',
      membership_number: null,
      membership_type_id: null,
      membership_status: 'Active' as const,
      joined_at: null,
      valid_from: null,
      valid_to: null,
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    };

    const personRow = {
      id: 'p1',
      user_id: 'u-x',
      first_name: 'Delegate',
      last_name: 'Target',
      email: 'd@e.f',
      middle_name: null,
      preferred_name: null,
      date_of_birth: '1992-03-03',
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

    const from = vi.fn((table: string) => {
      if (table === 'core_member') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: memberRow, error: null }),
            }),
          }),
        };
      }
      if (table === 'core_person') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: personRow, error: null }),
            }),
          }),
        };
      }
      if (table === 'core_phone') {
        return {
          select: () => ({
            eq: () => ({
              is: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const client = { from };

    const result = await fetchDelegatedMemberProfileLoadModel(
      secure as never,
      client as never,
      'm1'
    );

    expect(result.person.last_name).toBe('Target');
    expect(result.member?.id).toBe('m1');
    expect(result.phones).toEqual([]);
  });
});

describe('mapLoadModelToFormValues', () => {
  it('defaults phones and treats missing postal as same-as-residential', () => {
    const v = mapLoadModelToFormValues({
      person: {
        id: 'p1',
        user_id: 'u1',
        first_name: 'A',
        last_name: 'B',
        email: 'a@example.com',
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
      member: null,
      phones: [],
      residentialAddress: null,
      postalAddress: null,
    });
    expect(v.phones).toHaveLength(1);
    expect(v.postal_same_as_residential).toBe(true);
    expect(v.membership_status).toBe('Provisional');
  });
});
