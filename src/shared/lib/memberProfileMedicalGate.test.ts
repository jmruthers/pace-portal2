import { describe, expect, it } from 'vitest';
import { isMemberProfileIncompleteForMedical } from '@/shared/lib/memberProfileMedicalGate';
import type { MemberProfileLoadModel } from '@/hooks/member-profile/useMemberProfileData';

function mostlyCompleteLoad(): MemberProfileLoadModel {
  return {
    person: {
      id: 'p1',
      first_name: 'A',
      last_name: 'B',
      email: 'a@b.c',
      date_of_birth: '2000-01-01',
      preferred_name: null,
      gender_id: 2,
      pronoun_id: 3,
    },
    member: {
      id: 'm1',
      membership_type_id: 1,
      membership_number: 'M1',
    },
    phones: [],
    residentialAddress: null,
    postalAddress: null,
  } as unknown as MemberProfileLoadModel;
}

describe('isMemberProfileIncompleteForMedical', () => {
  it('returns true when data is needs_setup', () => {
    expect(isMemberProfileIncompleteForMedical('needs_setup', 'u1')).toBe(true);
  });

  it('returns true when member id is missing', () => {
    const load = mostlyCompleteLoad();
    load.member = null;
    expect(isMemberProfileIncompleteForMedical(load, 'u1')).toBe(true);
  });

  it('returns false when profile meets completeness threshold', () => {
    expect(isMemberProfileIncompleteForMedical(mostlyCompleteLoad(), 'u1')).toBe(false);
  });

  it('returns true when tracked fields are mostly empty', () => {
    const load = mostlyCompleteLoad();
    load.person.first_name = '';
    load.person.last_name = '';
    load.person.email = '';
    load.person.date_of_birth = '';
    load.person.gender_id = 0;
    load.person.pronoun_id = 0;
    load.member!.membership_type_id = null;
    load.member!.membership_number = null;
    expect(isMemberProfileIncompleteForMedical(load, 'u1')).toBe(true);
  });
});
