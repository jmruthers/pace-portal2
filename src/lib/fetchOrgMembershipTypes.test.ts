import { describe, expect, it, vi } from 'vitest';
import { filterMembershipTypesByAge, fetchOrgMembershipTypes } from '@/lib/fetchOrgMembershipTypes';
import { createOrganisationId, isOk } from '@solvera/pace-core/types';

describe('filterMembershipTypesByAge', () => {
  const types = [
    {
      id: 1,
      name: 'Child',
      minAge: 0,
      maxAge: 12,
      organisationId: createOrganisationId('org-1'),
    },
    {
      id: 2,
      name: 'Adult',
      minAge: 18,
      maxAge: null,
      organisationId: createOrganisationId('org-1'),
    },
  ];

  it('returns types matching age', () => {
    const r = filterMembershipTypesByAge('1990-06-01', types, new Date('2026-05-19'));
    expect(r.map((t) => t.id)).toEqual([2]);
  });

  it('returns unrestricted types when dob missing', () => {
    const r = filterMembershipTypesByAge(null, types);
    expect(r).toEqual([]);
  });

  it('excludes ineligible types', () => {
    const r = filterMembershipTypesByAge('2020-01-01', types, new Date('2026-05-19'));
    expect(r.map((t) => t.id)).toEqual([1]);
  });
});

describe('fetchOrgMembershipTypes', () => {
  it('queries active types for organisation', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'Adult',
            min_age: 18,
            max_age: null,
            organisation_id: 'org-1',
            is_active: true,
          },
        ],
        error: null,
      }),
    };
    const client = { from: vi.fn().mockReturnValue(chain) };

    const res = await fetchOrgMembershipTypes(client as never, createOrganisationId('org-1'));
    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0]?.name).toBe('Adult');
    }
    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
  });
});
