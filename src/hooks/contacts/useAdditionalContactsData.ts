import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';
import {
  groupFlatContactRows,
  type FlatContactRpcRow,
  type GroupedAdditionalContact,
} from '@/utils/contacts/groupAdditionalContactRows';
import { useProxyMode } from '@/shared/hooks/useProxyMode';

export type AdditionalContactsListMode = 'self' | 'proxy';

export type AdditionalContactsQueryKey = readonly [
  'additionalContacts',
  'v1',
  string | null,
  string | null,
  AdditionalContactsListMode,
  string | null,
];

/**
 * TanStack Query key for additional-contacts list; use with `invalidateQueries` from contact mutations.
 */
export function getAdditionalContactsQueryKey(input: {
  userId: string | null;
  organisationId: string | null;
  mode: AdditionalContactsListMode;
  targetMemberId: string | null;
}): AdditionalContactsQueryKey {
  return [
    'additionalContacts',
    'v1',
    input.userId,
    input.organisationId,
    input.mode,
    input.targetMemberId,
  ];
}

type ContactsListRpc = Database['public']['Functions']['data_pace_contacts_list'];
type MemberContactsRpc = Database['public']['Functions']['data_pace_member_contacts_list'];

async function fetchSelfServiceContacts(
  client: ReturnType<typeof toTypedSupabase>,
  userId: string
): Promise<GroupedAdditionalContact[]> {
  if (!client) {
    throw new Error('Client is not available.');
  }
  const { data, error } = await client.rpc('data_pace_contacts_list', {
    p_user_id: userId,
  } satisfies ContactsListRpc['Args']);
  if (error) {
    throw new Error(error.message || 'Could not load contacts.');
  }
  const rows = (data ?? []) as FlatContactRpcRow[];
  return groupFlatContactRows(rows);
}

async function fetchProxyMemberContacts(
  client: ReturnType<typeof toTypedSupabase>,
  targetMemberId: string
): Promise<GroupedAdditionalContact[]> {
  if (!client) {
    throw new Error('Client is not available.');
  }
  const { data, error } = await client.rpc('data_pace_member_contacts_list', {
    p_member_id: targetMemberId,
  } satisfies MemberContactsRpc['Args']);
  if (error) {
    throw new Error(error.message || 'Could not load contacts.');
  }
  const rows = (data ?? []) as FlatContactRpcRow[];
  return groupFlatContactRows(rows);
}

export type UseAdditionalContactsDataResult = {
  contacts: GroupedAdditionalContact[];
  mode: AdditionalContactsListMode;
  /** True while proxy target access is being validated (`useProxyMode`). */
  isProxyResolving: boolean;
  /** True when list query is loading (including initial fetch). */
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  organisationId: string | null;
};

/**
 * Loads additional contacts for `/additional-contacts`: self-service via `data_pace_contacts_list`,
 * or proxy mode via `data_pace_member_contacts_list` when delegated access is active.
 */
export function useAdditionalContactsData(): UseAdditionalContactsDataResult {
  const [searchParams] = useSearchParams();
  const targetMemberIdFromUrl = searchParams.get('targetMemberId');

  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;

  const {
    isProxyActive,
    targetMemberId,
    isValidating,
    validationError,
  } = useProxyMode();

  const mode: AdditionalContactsListMode =
    isProxyActive && targetMemberId ? 'proxy' : 'self';

  const baseReady = Boolean(client && userId && organisationId);

  const canFetchProxy = Boolean(
    baseReady && isProxyActive && targetMemberId
  );

  const canFetchSelf = Boolean(
    baseReady &&
      !isValidating &&
      !isProxyActive &&
      !(targetMemberIdFromUrl && (isValidating || Boolean(validationError)))
  );

  const queryEnabled = canFetchProxy || canFetchSelf;

  const queryKey = useMemo(
    () =>
      getAdditionalContactsQueryKey({
        userId,
        organisationId,
        mode,
        targetMemberId: mode === 'proxy' ? targetMemberId : null,
      }),
    [userId, organisationId, mode, targetMemberId]
  );

  const query = useQuery({
    queryKey,
    enabled: queryEnabled,
    staleTime: 30_000,
    queryFn: async (): Promise<GroupedAdditionalContact[]> => {
      if (!client || !userId) {
        throw new Error('Missing authentication context.');
      }
      if (isProxyActive && targetMemberId) {
        return fetchProxyMemberContacts(client, targetMemberId);
      }
      return fetchSelfServiceContacts(client, userId);
    },
  });

  const isProxyResolving = Boolean(targetMemberIdFromUrl && isValidating);

  return {
    contacts: query.data ?? [],
    mode,
    isProxyResolving,
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
    organisationId,
  };
}
