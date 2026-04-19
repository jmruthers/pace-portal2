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

const rbacState: {
  secure: { rpc: typeof rpc; from: typeof from } | null;
} = { secure: null };

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'acting-user' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => rbacState.secure,
}));

describe('useProxyMode', () => {
  beforeEach(() => {
    rbacState.secure = { rpc, from };
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

  it('clears proxy via setProxyTargetMemberId(null)', async () => {
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
      result.current.setProxyTargetMemberId('member-clear');
    });
    await waitFor(() => {
      expect(result.current.targetPersonId).toBe('p-target');
    });

    act(() => {
      result.current.setProxyTargetMemberId(null);
    });

    expect(result.current.targetMemberId).toBeNull();
    expect(result.current.targetPersonId).toBeNull();
    expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
  });

  it('clearProxy removes storage and resets state', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    localStorage.setItem(PROXY_TARGET_MEMBER_STORAGE_KEY, 'm-x');

    const { result } = renderHook(() => useProxyMode());

    await waitFor(() => {
      expect(result.current.targetPersonId).toBe('p-target');
    });

    act(() => {
      result.current.clearProxy();
    });

    expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
    expect(result.current.targetMemberId).toBeNull();
  });

  it('clears proxy when member row has no person_id', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    memberChain.maybeSingle.mockResolvedValueOnce({
      data: { person_id: null },
      error: null,
    });

    const { result } = renderHook(() => useProxyMode());

    act(() => {
      result.current.setProxyTargetMemberId('member-no-person');
    });

    await waitFor(() => {
      expect(result.current.validationError).toBe('Could not resolve delegated profile.');
    });
    expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
  });

  it('clears proxy when core_member lookup fails', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    memberChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('db'),
    });

    const { result } = renderHook(() => useProxyMode());

    act(() => {
      result.current.setProxyTargetMemberId('member-bad');
    });

    await waitFor(() => {
      expect(result.current.validationError).toBe('Could not resolve delegated profile.');
    });
    expect(localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY)).toBeNull();
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

  it('handles missing localStorage in SSR-like environments', () => {
    const original = globalThis.localStorage;
    delete (globalThis as { localStorage?: Storage }).localStorage;

    const { result } = renderHook(() => useProxyMode());

    expect(result.current.targetMemberId).toBeNull();

    act(() => {
      result.current.setProxyTargetMemberId('member-ssr');
    });
    expect(result.current.targetMemberId).toBe('member-ssr');

    globalThis.localStorage = original;
  });

  it('does not validate when secure client is unavailable', async () => {
    rbacState.secure = null;
    rpc.mockResolvedValue({ data: true, error: null });
    localStorage.setItem(PROXY_TARGET_MEMBER_STORAGE_KEY, 'member-x');

    renderHook(() => useProxyMode());

    await waitFor(() => {
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  it('ignores localStorage read failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { result } = renderHook(() => useProxyMode());

    expect(result.current.targetMemberId).toBeNull();
    spy.mockRestore();
  });

  it('continues when localStorage write fails', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
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
      result.current.setProxyTargetMemberId('member-write');
    });

    await waitFor(() => {
      expect(result.current.targetPersonId).toBe('p-target');
    });
    spy.mockRestore();
  });
});
