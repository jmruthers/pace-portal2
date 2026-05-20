import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createOrganisationId } from '@solvera/pace-core/types';
import {
  membershipListQueryKey,
  useMembershipList,
} from '@/hooks/memberships/useMembershipList';

const fetchMembershipListMock = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
}));

vi.mock('@/lib/fetchMembershipList', () => ({
  fetchMembershipList: (...args: unknown[]) => fetchMembershipListMock(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMembershipList', () => {
  beforeEach(() => {
    fetchMembershipListMock.mockReset();
  });

  it('loads membership items for the signed-in user', async () => {
    fetchMembershipListMock.mockResolvedValue({
      ok: true,
      data: [
        {
          memberId: 'm1',
          organisationId: createOrganisationId('org-1'),
          organisationName: 'Org One',
          membershipStatus: 'Active',
          membershipTypeId: 1,
          membershipTypeName: 'Member',
          membershipNumber: '100',
          requestId: null,
          requestStatus: null,
          requestSubmittedAt: null,
          displayKind: 'active',
          displayLabel: 'Active',
          showApplyAgain: false,
        },
      ],
    });

    const { result } = renderHook(() => useMembershipList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].organisationName).toBe('Org One');
    expect(fetchMembershipListMock).toHaveBeenCalledWith({}, 'user-1');
  });

  it('upserts a list item into the query cache', async () => {
    fetchMembershipListMock.mockResolvedValue({ ok: true, data: [] });

    const { result } = renderHook(() => useMembershipList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const item = {
      memberId: 'm-new',
      organisationId: createOrganisationId('org-2'),
      organisationName: 'Org Two',
      membershipStatus: 'Provisional',
      membershipTypeId: 2,
      membershipTypeName: 'Junior',
      membershipNumber: null,
      requestId: 'req-1',
      requestStatus: 'pending' as const,
      requestSubmittedAt: '2026-05-19T00:00:00.000Z',
      displayKind: 'awaiting_approval' as const,
      displayLabel: 'Awaiting approval',
      showApplyAgain: false,
    };

    result.current.upsertListItem(item);

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });
    expect(result.current.items[0].memberId).toBe('m-new');
  });

  it('exposes stable query key helper', () => {
    expect(membershipListQueryKey('user-1')).toEqual(['membershipList', 'v1', 'user-1']);
  });

  it('surfaces query errors', async () => {
    fetchMembershipListMock.mockResolvedValue({
      ok: false,
      error: { code: 'MEMBERSHIP_LIST_MEMBERS', message: 'Load failed' },
    });

    const { result } = renderHook(() => useMembershipList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.errorMessage).toMatch(/load failed/i);
  });
});
