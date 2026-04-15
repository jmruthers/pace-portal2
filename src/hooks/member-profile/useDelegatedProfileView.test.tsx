import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { useDelegatedProfileView } from '@/hooks/member-profile/useDelegatedProfileView';

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'o1' } }),
}));

const personRow = {
  id: 'p1',
  user_id: 'u1',
  first_name: 'A',
  last_name: 'B',
  email: 'a@b.c',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
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

const memberRow = {
  id: 'm1',
  person_id: 'p1',
  organisation_id: 'o1',
  membership_number: '1',
  membership_type_id: 1,
  membership_status: 'Active' as const,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

function buildSecureClient() {
  const rpc = vi.fn((name: string) => {
    if (name === 'check_user_pace_member_access_via_member_id') {
      return Promise.resolve({ data: true, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const from = vi.fn((table: string) => {
    if (table === 'core_member') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: memberRow, error: null }),
      };
    }
    if (table === 'core_person') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: personRow, error: null }),
      };
    }
    if (table === 'core_phone') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {};
  });

  return { rpc, from } as never;
}

let secureMock: ReturnType<typeof buildSecureClient>;

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => secureMock,
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDelegatedProfileView', () => {
  beforeEach(() => {
    secureMock = buildSecureClient();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockImplementation((c) => c as never);
  });

  it('loads person, member, and phones after RPC allows access', async () => {
    const { result } = renderHook(() => useDelegatedProfileView('m1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.person.id).toBe('p1');
    expect(result.current.data?.member.id).toBe('m1');
    expect(result.current.data?.phones).toEqual([]);
  });

  it('stays idle when member id is missing', () => {
    const { result } = renderHook(() => useDelegatedProfileView(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fails when access RPC returns false', async () => {
    secureMock = buildSecureClient();
    (secureMock as { rpc: ReturnType<typeof vi.fn> }).rpc.mockResolvedValue({
      data: false,
      error: null,
    });
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockImplementation((c) => c as never);

    const { result } = renderHook(() => useDelegatedProfileView('m1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('fails when member row is missing', async () => {
    secureMock = buildSecureClient();
    const from = vi.fn((table: string) => {
      if (table === 'core_member') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });
    (secureMock as { from: typeof from }).from = from;
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockImplementation((c) => c as never);

    const { result } = renderHook(() => useDelegatedProfileView('m1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
