import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { fetchCurrentPersonMember, NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';
import { addressRowToAddressValue } from '@/hooks/member-profile/addressMappers';
import type { MemberProfileFormValues } from '@/utils/member-profile/validation';

type PersonRow = Database['public']['Tables']['core_person']['Row'];
type MemberRow = Database['public']['Tables']['core_member']['Row'];
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];
type AddressRow = Database['public']['Tables']['core_address']['Row'];

export type MemberProfileLoadModel = {
  person: PersonRow;
  member: MemberRow | null;
  phones: PhoneRow[];
  residentialAddress: AddressRow | null;
  postalAddress: AddressRow | null;
};

function emptyAddressDefaults(): MemberProfileFormValues['residential'] {
  return {
    line1: '',
    locality: '',
    countryCode: 'AU',
  };
}

/**
 * Maps loaded rows to {@link MemberProfileFormValues} defaults for `Form` / reset.
 */
export function mapLoadModelToFormValues(model: MemberProfileLoadModel): MemberProfileFormValues {
  const res = model.residentialAddress
    ? addressRowToAddressValue(model.residentialAddress)
    : emptyAddressDefaults();
  const postalRow = model.postalAddress;
  const resId = model.person.residential_address_id;
  const postId = model.person.postal_address_id;
  const postalSame =
    Boolean(resId && postId && resId === postId) ||
    (!postalRow && !postId);

  const postal = postalSame
    ? null
    : postalRow
      ? addressRowToAddressValue(postalRow)
      : emptyAddressDefaults();

  const membershipStatus =
    model.member?.membership_status ??
    ('Provisional' as Database['public']['Enums']['pace_membership_status']);

  const phones =
    model.phones.length > 0
      ? model.phones.map((p) => ({
          id: p.id,
          phone_number: p.phone_number,
          phone_type_id: p.phone_type_id,
        }))
      : [{ phone_number: '', phone_type_id: null }];

  return {
    first_name: model.person.first_name,
    last_name: model.person.last_name,
    middle_name: model.person.middle_name,
    preferred_name: model.person.preferred_name,
    email: model.person.email ?? '',
    date_of_birth: model.person.date_of_birth ?? '',
    gender_id: model.person.gender_id ?? 0,
    pronoun_id: model.person.pronoun_id ?? 0,
    residential: res,
    postal_same_as_residential: postalSame,
    postal,
    membership_type_id: model.member?.membership_type_id ?? null,
    membership_number: model.member?.membership_number ?? null,
    membership_status: membershipStatus,
    phones,
  };
}

/**
 * Loads person, member, phones, and addresses for the member profile editor.
 */
export function useMemberProfileData() {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;

  return useQuery({
    queryKey: ['memberProfile', 'v1', userId, organisationId],
    enabled: Boolean(client && userId && organisationId),
    staleTime: 30_000,
    queryFn: async (): Promise<MemberProfileLoadModel | 'needs_setup'> => {
      if (!client || !userId || !organisationId) {
        throw new Error('Member profile requires organisation context.');
      }

      const pm = await fetchCurrentPersonMember(secure, userId, organisationId);
      if (!isOk(pm)) {
        if (pm.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
          return 'needs_setup';
        }
        throw new Error(pm.error.message);
      }

      const { person, member } = pm.data;
      const [phonesRes, resAddrRes, postAddrRes] = await Promise.all([
        client
          .from('core_phone')
          .select('*')
          .eq('person_id', person.id)
          .is('deleted_at', null),
        person.residential_address_id
          ? client.from('core_address').select('*').eq('id', person.residential_address_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        person.postal_address_id && person.postal_address_id !== person.residential_address_id
          ? client.from('core_address').select('*').eq('id', person.postal_address_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const firstErr = phonesRes.error ?? resAddrRes.error ?? postAddrRes.error;
      if (firstErr) {
        throw new Error(firstErr.message || 'Could not load profile details.');
      }

      return {
        person,
        member,
        phones: phonesRes.data ?? [],
        residentialAddress: resAddrRes.data,
        postalAddress: postAddrRes.data,
      };
    },
  });
}
