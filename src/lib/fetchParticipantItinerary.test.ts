import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import {
  fetchParticipantItinerary,
  PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES,
} from '@/lib/fetchParticipantItinerary';

type QueryResult = { data: unknown; error: null };

function createQueryChain(
  onEq: (column: string, value: unknown, count: number) => unknown,
  onIn: (column: string, values: unknown, count: number) => unknown
) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };
  chain.select.mockReturnValue(chain);

  let eqCount = 0;
  chain.eq.mockImplementation((column: string, value: unknown) => {
    eqCount += 1;
    return onEq(column, value, eqCount);
  });

  let inCount = 0;
  chain.in.mockImplementation((column: string, values: unknown) => {
    inCount += 1;
    return onIn(column, values, inCount);
  });

  return chain;
}

describe('fetchParticipantItinerary', () => {
  it('scopes assignments to application and event and filters logistics status at query layer', async () => {
    const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
    const inCalls: Array<{ table: string; column: string; values: unknown }> = [];

    const assignmentResult: QueryResult = {
      data: [
        {
          id: 'as-1',
          application_id: 'app-1',
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'tr-1',
          resource_type: 'transport',
        },
      ],
      error: null,
    };

    const transportResult: QueryResult = {
      data: [
        {
          id: 'tr-1',
          event_id: 'ev-1',
          departure_time: '2026-01-10T08:00:00Z',
          arrival_time: '2026-01-10T16:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'booked',
          transport_number: 'Coach',
          departure_display_name: null,
          arrival_display_name: null,
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
      ],
      error: null,
    };

    const assignmentChain = createQueryChain(
      (column, value, count) => {
        eqCalls.push({ table: 'trac_itinerary_assignment', column, value });
        return count >= 2 ? Promise.resolve(assignmentResult) : assignmentChain;
      },
      () => assignmentChain
    );

    const transportChain = createQueryChain(
      (column, value) => {
        eqCalls.push({ table: 'trac_transport', column, value });
        return transportChain;
      },
      (column, values, count) => {
        inCalls.push({ table: 'trac_transport', column, values });
        return count >= 2 ? Promise.resolve(transportResult) : transportChain;
      }
    );

    const emptyChain = createQueryChain(
      () => emptyChain,
      (_c, _v, count) => (count >= 2 ? Promise.resolve({ data: [], error: null }) : emptyChain)
    );

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'trac_itinerary_assignment') return assignmentChain;
        if (table === 'trac_transport') return transportChain;
        if (table === 'trac_activity' || table === 'trac_accommodation') return emptyChain;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const res = await fetchParticipantItinerary(client as never, 'app-1', 'ev-1');

    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;

    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { table: 'trac_itinerary_assignment', column: 'application_id', value: 'app-1' },
        { table: 'trac_itinerary_assignment', column: 'event_id', value: 'ev-1' },
        { table: 'trac_transport', column: 'event_id', value: 'ev-1' },
      ])
    );
    expect(inCalls).toEqual(
      expect.arrayContaining([
        { table: 'trac_transport', column: 'id', values: ['tr-1'] },
        {
          table: 'trac_transport',
          column: 'status',
          values: [...PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES],
        },
      ])
    );
    expect(res.data.transport).toHaveLength(1);
    expect(res.data.assignments).toHaveLength(1);
  });
});
