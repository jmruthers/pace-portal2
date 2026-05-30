import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import { usePersonOperations, type UpdatePersonMemberInput } from '@/hooks/member-profile/usePersonOperations';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

const personUpdateEq = vi.fn();
const personUpdateSelect = vi.fn(() => ({ eq: personUpdateEq }));
const personUpdate = vi.fn(() => ({ select: personUpdateSelect }));
const memberUpdateEq = vi.fn();
const memberUpdateSelect = vi.fn(() => ({ eq: vi.fn(() => ({ eq: memberUpdateEq })) }));
const memberUpdate = vi.fn(() => ({ select: memberUpdateSelect }));
const memberUpsertSingle = vi.fn();
const memberUpsert = vi.fn(() => ({
  select: vi.fn(() => ({ single: memberUpsertSingle })),
}));
const rpc = vi.fn();

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: vi.fn(),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

import { useSecureSupabase } from '@solvera/pace-core/rbac';

const baseInput: UpdatePersonMemberInput = {
  personId: 'p1',
  memberId: 'm1',
  organisationId: 'o1',
  person: {
    first_name: 'Alex',
    last_name: 'Lee',
    middle_name: null,
    preferred_name: null,
    email: 'alex@example.com',
    date_of_birth: '2000-01-01',
    gender_id: 1,
    pronoun_id: 1,
    residential_address_id: 'addr-1',
    postal_address_id: 'addr-1',
  },
  member: {
    membership_type_id: 1,
    membership_number: '100',
    membership_status: 'Active',
  },
};

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('usePersonOperations (PR07 error paths)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    personUpdateEq.mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    memberUpdateEq.mockResolvedValue({ data: [{ id: 'm1' }], error: null });
    memberUpsertSingle.mockResolvedValue({ data: { id: 'm-new' }, error: null });
    rpc.mockImplementation(async (name: string) => {
      if (name === 'app_pace_person_update') {
        return { data: [{ id: 'p1' }], error: null };
      }
      if (name === 'app_pace_member_update') {
        return { data: [{ id: 'm1' }], error: null };
      }
      return { data: [], error: null };
    });
    vi.mocked(useSecureSupabase).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'core_person') return { update: personUpdate };
        if (table === 'core_member') return { update: memberUpdate, upsert: memberUpsert };
        return {};
      }),
      rpc,
    } as never);
  });

  it('updatePersonMember returns PERSON_NO_CLIENT when secure client is missing', async () => {
    vi.mocked(useSecureSupabase).mockReturnValue(null);
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.updatePersonMember).toBeDefined());

    const out = await result.current.updatePersonMember(baseInput);
    expect(isOk(out)).toBe(false);
    if (!isOk(out)) {
      expect(out.error.code).toBe('PERSON_NO_CLIENT');
    }
  });

  it('updatePersonMember surfaces direct person update failures', async () => {
    personUpdateEq.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table core_person' },
    });
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    const out = await result.current.updatePersonMember(baseInput);
    expect(isOk(out)).toBe(false);
    if (!isOk(out)) {
      expect(out.error.code).toBe('PERSON_UPDATE');
      expect(out.error.message).toMatch(/permission denied/i);
    }
  });

  it('updatePersonMember falls back to RPC when direct person update affects no rows', async () => {
    personUpdateEq.mockResolvedValue({ data: [], error: null });
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    const out = await result.current.updatePersonMember(baseInput);
    expect(isOk(out)).toBe(true);
    expect(rpc).toHaveBeenCalledWith('app_pace_person_update', expect.objectContaining({ p_person_id: 'p1' }));
  });

  it('updatePersonMember surfaces member update failures', async () => {
    memberUpdateEq.mockResolvedValue({
      data: null,
      error: { message: 'membership update blocked' },
    });
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    const out = await result.current.updatePersonMember(baseInput);
    expect(isOk(out)).toBe(false);
    if (!isOk(out)) {
      expect(out.error.code).toBe('MEMBER_UPDATE');
      expect(out.error.message).toMatch(/membership update blocked/i);
    }
  });

  it('updatePersonMember upserts member when memberId is missing', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    const out = await result.current.updatePersonMember({ ...baseInput, memberId: null });
    expect(isOk(out)).toBe(true);
    expect(memberUpsert).toHaveBeenCalled();
  });

  it('savePersonMember rejects with coded error when persistence fails', async () => {
    personUpdateEq.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table core_person' },
    });
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });

    await expect(result.current.savePersonMember(baseInput)).rejects.toThrow(/PERSON_UPDATE:/);
  });
});
