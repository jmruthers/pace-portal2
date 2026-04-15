import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { err, ok } from '@solvera/pace-core/types';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { PROXY_TARGET_MEMBER_STORAGE_KEY } from '@/constants';
import * as userUtils from '@/shared/lib/utils/userUtils';

const rpc = vi.fn();
const memberChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { person_id: 'p-target' }, error: null }),
};

const from = vi.fn((table: string) => {
  if (table === 'core_member') return memberChain;
  return {};
});

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'acting-user' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () =>
    ({
      rpc,
      from,
    }) as never,
}));

describe('useProxyMode', () => {
  beforeEach(() => {
    localStorage.removeItem(PROXY_TARGET_MEMBER_STORAGE_KEY);
    rpc.mockReset();
    rpc.mockResolvedValue({ data: false, error: null });
    memberChain.maybeSingle.mockResolvedValue({ data: { person_id: 'p-target' }, error: null });
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({ code: 'USER_DATA_NOT_FOUND', message: 'skip self check in tests' })
    );
  });

  it('clears storage when RPC denies access', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    localStorage.setItem(PROXY_TARGET_MEMBER_STORAGE_KEY, 'bad-member');

    renderHook(() => useProxyMode());

    await waitFor(() => {
      expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
    });
  });

  it('calls access RPC and resolves person id when RPC allows access', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: { id: 'p-self' } as never,
        member: { id: 'other-member' } as never,
        usedReducedFieldFallback: false,
      })
    );

    const { result } = renderHook(() => useProxyMode());

    act(() => {
      result.current.setProxyTargetMemberId('member-1');
    });

    expect(result.current.targetMemberId).toBe('member-1');

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('check_user_pace_member_access_via_member_id', {
        p_member_id: 'member-1',
      });
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.targetPersonId).toBe('p-target');
    expect(result.current.proxyAttribution.actingUserId).toBe('acting-user');
  });

  it('clears proxy when RPC returns an error object', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('rpc') });
    localStorage.setItem(PROXY_TARGET_MEMBER_STORAGE_KEY, 'member-err');

    renderHook(() => useProxyMode());

    await waitFor(() => {
      expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
    });
  });

  it('clears storage and sets validation error when target matches acting user member (self-delegation)', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: { id: 'p-self' } as never,
        member: { id: 'member-1' } as never,
        usedReducedFieldFallback: false,
      })
    );

    const { result } = renderHook(() => useProxyMode());

    act(() => {
      result.current.setProxyTargetMemberId('member-1');
    });

    await waitFor(() => {
      expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
    });
    await waitFor(() => {
      expect(result.current.validationError).toEqual(
        'You cannot use a delegated session for your own membership.'
      );
    });
    expect(result.current.targetPersonId).toBeNull();
  });
});
