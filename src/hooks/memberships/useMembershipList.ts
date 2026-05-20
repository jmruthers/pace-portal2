import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { fetchMembershipList } from '@/lib/fetchMembershipList';
import type { MembershipListItem } from '@/lib/memberRequestTypes';

export const MEMBERSHIP_LIST_QUERY_KEY = 'membershipList';

export type UseMembershipListResult = {
  items: MembershipListItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => Promise<unknown>;
  upsertListItem: (item: MembershipListItem) => void;
};

export function membershipListQueryKey(userId: string | null): readonly unknown[] {
  return [MEMBERSHIP_LIST_QUERY_KEY, 'v1', userId] as const;
}

/**
 * PR22 — All memberships for the signed-in user with display state derived from member + request rows.
 */
export function useMembershipList(): UseMembershipListResult {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: membershipListQueryKey(userId),
    enabled: Boolean(client && userId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!client || !userId) {
        return [];
      }
      const res = await fetchMembershipList(client, userId);
      if (!isOk(res)) {
        throw new Error(res.error.message ?? 'Could not load memberships.');
      }
      return res.data;
    },
  });

  const upsertListItem = useCallback(
    (item: MembershipListItem) => {
      if (!userId) return;
      queryClient.setQueryData<MembershipListItem[]>(membershipListQueryKey(userId), (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex(
          (m) => m.memberId === item.memberId || m.organisationId === item.organisationId
        );
        if (idx >= 0) {
          const next = [...list];
          next[idx] = item;
          return next;
        }
        return [item, ...list];
      });
    },
    [queryClient, userId]
  );

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    upsertListItem,
  };
}
