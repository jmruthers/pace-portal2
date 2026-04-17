import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import { usePersonOperations } from '@/hooks/member-profile/usePersonOperations';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({
    from: vi.fn((table: string) => {
      if (table === 'core_person') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === 'core_member') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }
      return {};
    }),
  }),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('usePersonOperations integration', () => {
  it('updatePersonMember succeeds when updates succeed', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePersonOperations(), { wrapper: wrapper(qc) });
    const r = await result.current.updatePersonMember({
      personId: 'p1',
      memberId: 'm1',
      organisationId: 'o1',
      person: {
        first_name: 'A',
        last_name: 'B',
        middle_name: null,
        preferred_name: null,
        email: 'a@example.com',
        date_of_birth: '1990-01-01',
        gender_id: 1,
        pronoun_id: 1,
        residential_address_id: 'addr1',
        postal_address_id: 'addr1',
      },
      member: {
        membership_type_id: 1,
        membership_number: '1',
        membership_status: 'Active',
      },
    });
    expect(isOk(r)).toBe(true);
  });
});
