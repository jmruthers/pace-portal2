import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
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

type MemberContactsRpc = Database['public']['Functions']['data_pace_member_contacts_list'];

function normalizeFlatContactRows(rows: Array<Record<string, unknown>>): FlatContactRpcRow[] {
  return rows
    .map((row) => {
      const contactTypeId = String(row.contact_type_id ?? '').trim();
      if (contactTypeId === '') return null;

      return {
        contact_id: String(row.contact_id ?? ''),
        contact_person_id: String(row.contact_person_id ?? ''),
        contact_type_id: contactTypeId,
        contact_type_name: String(row.contact_type_name ?? ''),
        email: String(row.email ?? ''),
        first_name: String(row.first_name ?? ''),
        last_name: String(row.last_name ?? ''),
        member_id: String(row.member_id ?? ''),
        organisation_id: String(row.organisation_id ?? ''),
        permission_type: String(row.permission_type ?? ''),
        phone_number: String(row.phone_number ?? ''),
        phone_type: String(row.phone_type ?? ''),
        ...(row.access_level == null ? {} : { access_level: String(row.access_level) }),
      } satisfies FlatContactRpcRow;
    })
    .filter((row): row is FlatContactRpcRow => row != null);
}

async function fetchSelfServiceContacts(
  secure: ReturnType<typeof useSecureSupabase>,
  client: ReturnType<typeof toTypedSupabase>,
  userId: string,
  organisationId: string
): Promise<ApiResult<GroupedAdditionalContact[]>> {
  try {
    if (!secure || !client) {
      return err({
        code: 'CONTACTS_CONTEXT',
        message: 'Client is not available.',
      });
    }
    const pm = await fetchCurrentPersonMember(secure, userId, organisationId);
    if (!isOk(pm) || !pm.data.member?.id) {
      return err({
        code: 'CONTACTS_CONTEXT',
        message: 'Could not resolve current member for contacts list.',
      });
    }
    const { data, error } = await client.rpc('data_pace_member_contacts_list', {
      p_member_id: pm.data.member.id,
    } satisfies MemberContactsRpc['Args']);
    if (error) {
      return err({
        code: 'CONTACTS_LIST',
        message: error.message || 'Could not load contacts.',
      });
    }
    const rows = normalizeFlatContactRows((data ?? []) as Array<Record<string, unknown>>);
    return ok(groupFlatContactRows(rows));
  } catch (error) {
    return err(normalizeToApiError(error, 'CONTACTS_LIST', 'Could not load contacts.'));
  }
}

async function fetchProxyMemberContacts(
  client: ReturnType<typeof toTypedSupabase>,
  targetMemberId: string
): Promise<ApiResult<GroupedAdditionalContact[]>> {
  try {
    if (!client) {
      return err({
        code: 'CONTACTS_CONTEXT',
        message: 'Client is not available.',
      });
    }
    const { data, error } = await client.rpc('data_pace_member_contacts_list', {
      p_member_id: targetMemberId,
    } satisfies MemberContactsRpc['Args']);
    if (error) {
      return err({
        code: 'CONTACTS_PROXY_LIST',
        message: error.message || 'Could not load contacts.',
      });
    }
    const rows = normalizeFlatContactRows((data ?? []) as Array<Record<string, unknown>>);
    return ok(groupFlatContactRows(rows));
  } catch (error) {
    return err(normalizeToApiError(error, 'CONTACTS_PROXY_LIST', 'Could not load contacts.'));
  }
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
 * Loads additional contacts for `/additional-contacts` using member-scoped RPC data.
 * Self-service resolves the signed-in user's member id first, then calls `data_pace_member_contacts_list`.
 * Proxy mode calls `data_pace_member_contacts_list` directly with the delegated target member id.
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
        const result = await fetchProxyMemberContacts(client, targetMemberId);
        if (!isOk(result)) {
          throw new Error(result.error.message);
        }
        return result.data;
      }
      if (!organisationId) {
        throw new Error('Missing organisation context.');
      }
      const result = await fetchSelfServiceContacts(secure, client, userId, organisationId);
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
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
