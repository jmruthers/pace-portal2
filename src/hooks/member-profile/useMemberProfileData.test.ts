import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { err } from '@solvera/pace-core/types';
import * as userUtils from '@/shared/lib/utils/userUtils';
import { mapLoadModelToFormValues, useMemberProfileData } from '@/hooks/member-profile/useMemberProfileData';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'o1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({ from: vi.fn() }),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useMemberProfileData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns needs_setup when person is missing', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({
        code: userUtils.NO_PERSON_PROFILE_ERROR_CODE,
        message: 'Could not load profile.',
      })
    );
    const qc = new QueryClient();
    const { result } = renderHook(() => useMemberProfileData(), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBe('needs_setup');
  });
});

describe('mapLoadModelToFormValues', () => {
  it('defaults phones and treats missing postal as same-as-residential', () => {
    const v = mapLoadModelToFormValues({
      person: {
        id: 'p1',
        user_id: 'u1',
        first_name: 'A',
        last_name: 'B',
        email: 'a@example.com',
        middle_name: null,
        preferred_name: null,
        date_of_birth: '1990-01-01',
        gender_id: 1,
        pronoun_id: 1,
        residential_address_id: null,
        postal_address_id: null,
        created_at: null,
        created_by: null,
        deleted_at: null,
        updated_at: null,
        updated_by: null,
      },
      member: null,
      phones: [],
      residentialAddress: null,
      postalAddress: null,
    });
    expect(v.phones).toHaveLength(1);
    expect(v.postal_same_as_residential).toBe(true);
    expect(v.membership_status).toBe('Provisional');
  });
});
