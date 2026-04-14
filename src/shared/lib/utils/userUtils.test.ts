import { describe, expect, it, vi } from 'vitest';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { resetUserDataCacheForTests } from '@/shared/lib/utils/userDataCache';
import { isOk } from '@solvera/pace-core/types';

describe('fetchCurrentPersonMember', () => {
  it('returns primary path when person+member join succeeds', async () => {
    resetUserDataCacheForTests();
    const person = {
      id: 'p1',
      user_id: 'u1',
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.c',
      middle_name: null,
      preferred_name: null,
      date_of_birth: null,
      address_id: null,
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    };
    const member = {
      id: 'm1',
      person_id: 'p1',
      organisation_id: 'o1',
      membership_number: '1',
      membership_type_id: 1,
      gender_id: 1,
      pronoun_id: 1,
      membership_status: 'active',
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    };

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_person') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...person, core_member: member },
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    const r = await fetchCurrentPersonMember(client as never, 'u1', 'o1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.usedReducedFieldFallback).toBe(false);
      expect(r.data.person.id).toBe('p1');
      expect(r.data.member?.id).toBe('m1');
    }
  });

  it('uses only the reduced-field fallback when primary returns no row', async () => {
    resetUserDataCacheForTests();
    let personPass = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_person') {
          personPass += 1;
          if (personPass === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (personPass === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'p1',
                  user_id: 'u1',
                  first_name: 'A',
                  last_name: 'B',
                  email: 'e@e.e',
                },
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'p1',
                user_id: 'u1',
                first_name: 'A',
                last_name: 'B',
                email: 'e@e.e',
                middle_name: null,
                preferred_name: null,
                date_of_birth: null,
                address_id: null,
                created_at: null,
                created_by: null,
                deleted_at: null,
                updated_at: null,
                updated_by: null,
              },
              error: null,
            }),
          };
        }
        if (table === 'core_member') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'm1',
                person_id: 'p1',
                organisation_id: 'o1',
                membership_number: null,
                membership_type_id: null,
                gender_id: null,
                pronoun_id: null,
                membership_status: null,
                created_at: null,
                created_by: null,
                deleted_at: null,
                updated_at: null,
                updated_by: null,
              },
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    const r = await fetchCurrentPersonMember(client as never, 'u1', 'o1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.usedReducedFieldFallback).toBe(true);
    }
  });
});
