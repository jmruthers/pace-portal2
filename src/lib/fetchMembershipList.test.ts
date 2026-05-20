import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { fetchMembershipList } from '@/lib/fetchMembershipList';

function createChain(responses: Record<string, unknown>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.maybeSingle.mockImplementation(() => responses.maybeSingle ?? { data: null, error: null });
  return chain;
}

describe('fetchMembershipList', () => {
  it('returns empty list when person is missing', async () => {
    const personChain = createChain({
      maybeSingle: { data: null, error: null },
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_person') return personChain;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const res = await fetchMembershipList(client as never, 'user-1');
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.data).toEqual([]);
  });

  it('derives awaiting approval from Provisional member with pending request', async () => {
    const personChain = createChain({
      maybeSingle: { data: { id: 'person-1' }, error: null },
    });
    const membersChain = createChain({});
    membersChain.order.mockResolvedValue({
      data: [
        {
          id: 'mem-1',
          organisation_id: 'org-a',
          membership_status: 'Provisional',
          membership_type_id: 1,
          membership_number: null,
          core_organisations: { id: 'org-a', name: 'Org A', display_name: 'Org A' },
          core_membership_type: { id: 1, name: 'Member' },
        },
      ],
      error: null,
    });
    const requestsChain = createChain({});
    requestsChain.order.mockResolvedValue({
      data: [
        {
          id: 'req-1',
          status: 'pending',
          created_at: '2026-05-15T00:00:00.000Z',
          subject_member_id: 'mem-1',
          target_organisation_id: 'org-a',
        },
      ],
      error: null,
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_person') return personChain;
        if (table === 'core_member') return membersChain;
        if (table === 'team_member_request') return requestsChain;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const res = await fetchMembershipList(client as never, 'user-1');
    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0].displayKind).toBe('awaiting_approval');
      expect(res.data[0].displayLabel).toBe('Awaiting approval');
      expect(res.data[0].requestSubmittedAt).toBe('2026-05-15T00:00:00.000Z');
    }
  });
});
