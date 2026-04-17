import { describe, expect, it, vi, beforeEach } from 'vitest';
import { err, isErr, isOk, ok } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import * as supabaseTyped from '@/lib/supabase-typed';
import * as userUtils from '@/shared/lib/utils/userUtils';
import {
  fetchEnhancedLanding,
  NO_PERSON_PROFILE_ERROR_CODE,
} from '@/shared/hooks/useEnhancedLanding';

const samplePerson = {
  id: 'p1',
  first_name: 'A',
  last_name: 'B',
  email: 'a@b.c',
  user_id: 'u1',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
  gender_id: null,
  pronoun_id: null,
  residential_address_id: null,
  postal_address_id: null,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

function buildLandingMockClient(options?: { eventsQueryFails?: boolean }) {
  const rpc = vi.fn((name: string) => {
    if (name === 'data_pace_contacts_list') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  const from = vi.fn((table: string) => {
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
        order: vi.fn().mockResolvedValue(
          options?.eventsQueryFails
            ? { data: null, error: { message: 'events failed' } }
            : { data: [], error: null }
        ),
      };
    }
    return {};
  });
  return { from, rpc } as never;
}

describe('fetchEnhancedLanding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok empty model when user has no person record', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({
        code: NO_PERSON_PROFILE_ERROR_CODE,
        message: 'Could not load profile.',
      })
    );
    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.needsProfileSetup).toBe(true);
      expect(r.data.person).toBeNull();
    }
  });

  it('returns err when person fetch fails with a non-setup code', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({ code: 'USER_DATA_NO_CLIENT', message: 'Client is not available.' })
    );
    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('USER_DATA_NO_CLIENT');
    }
  });

  it('returns err when secure client is missing', async () => {
    const r = await fetchEnhancedLanding(null, 'u1', 'o1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('ENHANCED_LANDING_CONTEXT');
    }
  });

  it('returns ok aggregate when person exists and subqueries succeed', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(buildLandingMockClient());

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.person?.id).toBe('p1');
      expect(r.data.needsProfileSetup).toBe(false);
      expect(r.data.additionalContacts).toEqual([]);
    }
  });

  it('returns err when a parallel table query fails', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(buildLandingMockClient({ eventsQueryFails: true }));

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('ENHANCED_LANDING_QUERY');
    }
  });
});
