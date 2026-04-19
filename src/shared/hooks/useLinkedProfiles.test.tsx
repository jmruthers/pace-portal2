import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  enrichLinkedProfilesWithMemberIds,
  useLinkedProfiles,
  type LinkedProfileRow,
} from '@/shared/hooks/useLinkedProfiles';

vi.mock('@/lib/env', () => ({
  isSupabaseConfigured: true,
}));

const getSession = vi.fn();
const rpc = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
    supabase: {
      auth: { getSession },
      rpc,
    },
    session: { user: { id: 'u1' } },
    isLoading: false,
    sessionRestoration: { isRestoring: false },
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const baseRow = (overrides: Partial<LinkedProfileRow> = {}): LinkedProfileRow => ({
  person_id: 'p1',
  first_name: 'A',
  last_name: 'B',
  organisation_name: 'Org',
  permission_type: 'view',
  ...overrides,
});

describe('enrichLinkedProfilesWithMemberIds', () => {
  it('returns an empty list without querying', async () => {
    const from = vi.fn();
    const client = { from } as never;
    const out = await enrichLinkedProfilesWithMemberIds(client, []);
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('returns early when every row already has member_id', async () => {
    const from = vi.fn();
    const client = { from } as never;
    const rows = [baseRow({ member_id: 'm1' })];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(from).not.toHaveBeenCalled();
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data[0]?.member_id).toBe('m1');
  });

  it('returns rows unchanged when member lookup returns nothing', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
    const client = { from } as never;
    const rows = [baseRow()];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data[0]?.member_id).toBeUndefined();
  });

  it('matches organisation_id when multiple candidates exist', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'wrong', person_id: 'p1', organisation_id: 'other' },
          { id: 'right', person_id: 'p1', organisation_id: 'org-a' },
        ],
        error: null,
      }),
    }));
    const client = { from } as never;
    const rows = [baseRow({ organisation_id: 'org-a' })];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data[0]?.member_id).toBe('right');
  });

  it('uses a single candidate when organisation_id is absent', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'only', person_id: 'p1', organisation_id: 'org-x' }],
        error: null,
      }),
    }));
    const client = { from } as never;
    const rows = [baseRow()];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data[0]?.member_id).toBe('only');
  });

  it('returns err when core_member query errors', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'db' } }),
    }));
    const client = { from } as never;
    const rows = [baseRow()];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(isErr(out)).toBe(true);
    if (isErr(out)) expect(out.error.code).toBe('LINKED_PROFILE_MEMBER_LOOKUP');
  });

  it('does not guess member_id when multiple candidates share person_id without organisation_id', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'a', person_id: 'p1', organisation_id: 'o1' },
          { id: 'b', person_id: 'p1', organisation_id: 'o2' },
        ],
        error: null,
      }),
    }));
    const client = { from } as never;
    const rows = [baseRow()];
    const out = await enrichLinkedProfilesWithMemberIds(client, rows);
    expect(isOk(out)).toBe(true);
    if (isOk(out)) expect(out.data[0]?.member_id).toBeUndefined();
  });
});

describe('useLinkedProfiles', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    rpc.mockResolvedValue({
      data: [
        {
          person_id: 'p1',
          first_name: 'A',
          last_name: 'B',
          organisation_name: 'Org',
          permission_type: 'view',
          member_id: 'm1',
        },
      ],
      error: null,
    });
  });

  it('returns linked profile rows from RPC', async () => {
    const { result } = renderHook(() => useLinkedProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0]?.first_name).toBe('A');
    expect(rpc).toHaveBeenCalledWith('data_pace_linked_profiles_list', { p_user_id: 'u1' });
  });

  it('errors when RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'bad rpc' } });

    const { result } = renderHook(() => useLinkedProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
