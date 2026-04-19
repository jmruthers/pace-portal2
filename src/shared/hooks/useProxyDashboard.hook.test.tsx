import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { useProxyDashboard } from '@/shared/hooks/useProxyDashboard';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

const targetPerson = {
  id: 'p1',
  first_name: 'A',
  last_name: 'B',
  email: 'a@b.c',
  user_id: 'u-other',
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

const targetMember = {
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

function buildDelegatedWorkspaceClient() {
  const rpc = vi.fn((name: string) => {
    if (name === 'data_pace_member_contacts_list') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const from = vi.fn((table: string) => {
    if (table === 'core_member') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: targetMember, error: null }),
      };
    }
    if (table === 'core_person') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: targetPerson, error: null }),
      };
    }
    if (table === 'medi_profile') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    if (table === 'core_phone') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    if (table === 'core_events') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {};
  });

  return { from, rpc } as never;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProxyDashboard', () => {
  beforeEach(() => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(buildDelegatedWorkspaceClient());
  });

  it('does not run query until proxy context is active', () => {
    const { result } = renderHook(
      () =>
        useProxyDashboard({
          isProxyActive: false,
          targetMemberId: null,
          targetPersonId: null,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('loads delegated workspace when proxy is active', async () => {
    const { result } = renderHook(
      () =>
        useProxyDashboard({
          isProxyActive: true,
          targetMemberId: 'm1',
          targetPersonId: 'p1',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.person?.id).toBe('p1');
  });
});
