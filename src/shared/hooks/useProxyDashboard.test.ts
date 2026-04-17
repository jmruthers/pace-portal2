import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import * as supabaseTyped from '@/lib/supabase-typed';
import { fetchDelegatedWorkspace } from '@/shared/hooks/useProxyDashboard';

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

describe('fetchDelegatedWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns err when secure client is missing', async () => {
    const r = await fetchDelegatedWorkspace(null, 'o1', 'm1', 'p1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('PROXY_DASHBOARD_CONTEXT');
    }
  });

  it('returns ok aggregate when member and person resolve and subqueries succeed', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(buildDelegatedWorkspaceClient());

    const r = await fetchDelegatedWorkspace({} as RBACSupabaseClient, 'o1', 'm1', 'p1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.person?.id).toBe('p1');
      expect(r.data.member?.id).toBe('m1');
      expect(r.data.phones).toEqual([]);
      expect(r.data.additionalContacts).toEqual([]);
    }
  });

  it('returns err when member person_id does not match target person', async () => {
    const badMember = { ...targetMember, person_id: 'other-person' };
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      {
        from: vi.fn((table: string) => {
          if (table === 'core_member') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: badMember, error: null }),
            };
          }
          if (table === 'core_person') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: targetPerson, error: null }),
            };
          }
          return {};
        }),
        rpc: vi.fn(),
      } as never
    );

    const r = await fetchDelegatedWorkspace({} as RBACSupabaseClient, 'o1', 'm1', 'p1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('PROXY_DASHBOARD_MEMBER');
    }
  });
});
