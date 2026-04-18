import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { err, isErr, isOk, ok } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
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

type FormRow = {
  event_id: string;
  status: 'published' | 'draft' | 'closed';
  is_active: boolean | null;
  opens_at: string | null;
  closes_at: string | null;
};

function buildLandingMockClient(options?: {
  eventsQueryFails?: boolean;
  formsQueryFails?: boolean;
  formRows?: FormRow[];
  eventRows?: unknown[];
}) {
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
    if (table === 'core_forms') {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(
          options?.formsQueryFails
            ? { data: null, error: { message: 'forms failed' } }
            : { data: options?.formRows ?? [], error: null }
        ),
      };
    }
    if (table === 'core_events') {
      const chain = {
        select: vi.fn(function selectFn() {
          return chain;
        }),
        in: vi.fn(function inFn() {
          return chain;
        }),
        order: vi.fn().mockResolvedValue(
          options?.eventsQueryFails
            ? { data: null, error: { message: 'events failed' } }
            : { data: options?.eventRows ?? [], error: null }
        ),
      };
      return chain;
    }
    if (table === 'core_file_references') {
      const chain = {
        select: vi.fn(function selectFn() {
          return chain;
        }),
        eq: vi.fn(function eqFn() {
          return chain;
        }),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      return chain;
    }
    return {};
  });
  return { from, rpc } as unknown as Pick<SupabaseClient<Database>, 'from' | 'rpc'>;
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
    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
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
    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('USER_DATA_NO_CLIENT');
    }
  });

  it('returns err when secure client is missing', async () => {
    const r = await fetchEnhancedLanding(null, 'u1', 'o1', ['o1']);
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
    const client = buildLandingMockClient();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(client as unknown as SupabaseClient<Database>);

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.person?.id).toBe('p1');
      expect(r.data.needsProfileSetup).toBe(false);
      expect(r.data.additionalContacts).toEqual([]);
      expect(r.data.eventsByCategory).toEqual({});
    }
    expect(client.from).toHaveBeenCalledWith('core_forms');
    expect(client.from).not.toHaveBeenCalledWith('core_events');
  });

  it('returns err when core_forms query fails', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      buildLandingMockClient({ formsQueryFails: true }) as unknown as SupabaseClient<Database>
    );

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('ENHANCED_LANDING_QUERY');
    }
  });

  it('returns err when core_events query fails after eligible forms exist', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      buildLandingMockClient({
        eventsQueryFails: true,
        formRows: [
          {
            event_id: 'ev1',
            status: 'published',
            is_active: true,
            opens_at: null,
            closes_at: null,
          },
        ],
      }) as unknown as SupabaseClient<Database>
    );

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('ENHANCED_LANDING_QUERY');
    }
  });

  it('returns events only when a published form is eligible', async () => {
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );
    const sampleEvent = {
      event_id: 'ev1',
      event_name: 'Camp',
      organisation_id: 'o1',
      registration_scope: 'camp',
      created_at: null,
      created_by: null,
      description: null,
      event_code: 'c',
      event_colours: null,
      event_date: null,
      event_days: null,
      event_email: null,
      event_venue: null,
      expected_participants: null,
      is_visible: true,
      public_readable: true,
      participant_admin_email: null,
      participant_blurb: null,
      participant_website_url: null,
      typical_unit_size: null,
      updated_at: null,
      updated_by: null,
    };
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      buildLandingMockClient({
        formRows: [
          {
            event_id: 'ev1',
            status: 'published',
            is_active: true,
            opens_at: null,
            closes_at: null,
          },
        ],
        eventRows: [sampleEvent],
      }) as unknown as SupabaseClient<Database>
    );

    const r = await fetchEnhancedLanding({} as RBACSupabaseClient, 'u1', 'o1', ['o1']);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.eventsByCategory.camp?.map((e) => e.event_id)).toEqual(['ev1']);
    }
  });
});
