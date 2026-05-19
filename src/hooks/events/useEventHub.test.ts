import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { err, isErr, isOk, ok } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import * as supabaseTyped from '@/lib/supabase-typed';
import * as userUtils from '@/shared/lib/utils/userUtils';
import { fetchEventHub } from '@/hooks/events/useEventHub';

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

const baseEventRow: Database['public']['Tables']['core_events']['Row'] = {
  event_id: 'ev1',
  event_name: 'Camp',
  event_code: 'camp',
  organisation_id: 'o1',
  event_date: '2026-06-01',
  event_days: null,
  participant_blurb: 'Hi',
  participant_admin_email: 'o@example.com',
  participant_website_url: 'https://camp.example',
  registration_scope: 'camp',
  created_at: null,
  created_by: null,
  description: null,
  event_colours: null,
  event_email: null,
  event_venue: null,
  expected_participants: null,
  is_visible: true,
  public_readable: true,
  typical_unit_size: null,
  updated_at: null,
  updated_by: null,
  logo_id: null,
};

function createAwaitableChain<TResult>(resolution: Promise<TResult>) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    in: vi.fn(() => self),
    maybeSingle: vi.fn(() => resolution),
    then: (onFulfilled: (v: TResult) => unknown, onRejected?: unknown) =>
      resolution.then(onFulfilled as never, onRejected as never),
  };
  return self;
}

type HubClientOptions = {
  eventResponses?: Promise<{ data: unknown; error: { message?: string } | null }>[];
  formsResolution?: Promise<{ data: unknown[]; error: { message?: string } | null }>;
  applicationResolution?: Promise<{ data: unknown; error: { message?: string } | null }>;
};

function createHubMockClient(opts: HubClientOptions) {
  const eventResponses = opts.eventResponses ?? [
    Promise.resolve({ data: baseEventRow, error: null }),
  ];
  let eventCall = 0;

  const from = vi.fn((table: string) => {
    if (table === 'core_events') {
      const pr = eventResponses[eventCall] ?? Promise.resolve({ data: null, error: null });
      eventCall += 1;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => pr),
      };
    }
    if (table === 'base_application') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(
          () => opts.applicationResolution ?? Promise.resolve({ data: { status: 'draft' }, error: null })
        ),
      };
    }
    if (table === 'core_forms') {
      return createAwaitableChain(
        opts.formsResolution ??
          Promise.resolve({
            data: [
              {
                id: 'f1',
                name: 'reg',
                title: 'Registration',
                slug: 'reg',
                sort_order: 1,
                opens_at: null,
                closes_at: null,
                event_id: 'ev1',
                organisation_id: 'o1',
                status: 'published',
                is_active: true,
              },
            ],
            error: null,
          })
      );
    }
    return {};
  });
  return { from } as unknown as Pick<SupabaseClient<Database>, 'from'>;
}

describe('fetchEventHub', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns hub data when event, application, and forms resolve', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(createHubMockClient({}) as never);
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'camp');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.data.event.event_id).toBe('ev1');
    expect(r.data.applicationStatus).toBe('draft');
    expect(r.data.needsProfileSetup).toBe(false);
    expect(r.data.eligibleFormLinks).toHaveLength(1);
    expect(r.data.inactiveFormWindow).toBe(false);
  });

  it('returns EVENT_NOT_FOUND when lookup finds no rows', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      createHubMockClient({
        eventResponses: [Promise.resolve({ data: null, error: null })],
      }) as never
    );
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'camp');
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('retries lowercase event_code when first lookup misses but mixed-case slug differs', async () => {
    const lowerRow = { ...baseEventRow, event_code: 'mixed' };
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      createHubMockClient({
        eventResponses: [
          Promise.resolve({ data: null, error: null }),
          Promise.resolve({ data: lowerRow, error: null }),
        ],
      }) as never
    );
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'Mixed');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.data.event.event_id).toBe('ev1');
  });

  it('sets needsProfileSetup when member has no person yet', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(createHubMockClient({}) as never);
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      err({
        code: userUtils.NO_PERSON_PROFILE_ERROR_CODE,
        message: 'no person',
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'camp');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.data.needsProfileSetup).toBe(true);
    expect(r.data.applicationStatus).toBeNull();
  });

  it('marks inactive window when forms exist but none are eligible now', async () => {
    const pastClose = new Date(Date.now() - 86_400_000).toISOString();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      createHubMockClient({
        formsResolution: Promise.resolve({
          data: [
            {
              id: 'f1',
              name: 'reg',
              title: '',
              slug: 'reg',
              sort_order: 1,
              opens_at: null,
              closes_at: pastClose,
              event_id: 'ev1',
              organisation_id: 'o1',
              status: 'published',
              is_active: true,
            },
          ],
          error: null,
        }),
      }) as never
    );
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'camp');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.data.inactiveFormWindow).toBe(true);
    expect(r.data.eligibleFormLinks).toHaveLength(0);
  });

  it('returns EVENT_HUB_QUERY when core_events returns an error', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(
      createHubMockClient({
        eventResponses: [
          Promise.resolve({ data: null, error: { message: 'rls deny' } }),
        ],
      }) as never
    );
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue(
      ok({
        person: samplePerson,
        member: null,
        usedReducedFieldFallback: false,
      })
    );

    const r = await fetchEventHub({} as RBACSupabaseClient, 'u1', 'o1', ['o1'], 'camp');
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.code).toBe('EVENT_HUB_QUERY');
  });
});
