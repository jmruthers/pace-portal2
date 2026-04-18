import { describe, expect, it, vi } from 'vitest';
import { fetchCurrentPersonMember, NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';
import { resetUserDataCacheForTests } from '@/shared/lib/utils/userDataCache';
import { isOk, isErr } from '@solvera/pace-core/types';

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
    const member = {
      id: 'm1',
      person_id: 'p1',
      organisation_id: 'o1',
      membership_number: '1',
      membership_type_id: 1,
      membership_status: 'Active',
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
                  gender_id: null,
                  pronoun_id: null,
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
                gender_id: null,
                pronoun_id: null,
                residential_address_id: null,
                postal_address_id: null,
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

  it('returns error when client is null', async () => {
    resetUserDataCacheForTests();
    const r = await fetchCurrentPersonMember(null, 'u1', 'o1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('USER_DATA_NO_CLIENT');
    }
  });

  it('uses fallback when primary query errors', async () => {
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
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'join failed' },
              }),
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
                gender_id: null,
                pronoun_id: null,
                residential_address_id: null,
                postal_address_id: null,
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
  });

  it('returns NO_PERSON when fallback finds no person row', async () => {
    resetUserDataCacheForTests();
    let personCalls = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_person') {
          personCalls += 1;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(async () => {
              if (personCalls === 1) {
                return { data: null, error: null };
              }
              return { data: null, error: null };
            }),
          };
        }
        return {};
      }),
    };

    const r = await fetchCurrentPersonMember(client as never, 'u1', 'o1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe(NO_PERSON_PROFILE_ERROR_CODE);
    }
  });
});
