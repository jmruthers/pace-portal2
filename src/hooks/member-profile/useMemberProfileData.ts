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
import { useProxyMode } from '@/shared/hooks/useProxyMode';

type SecureSupabase = ReturnType<typeof useSecureSupabase>;
type TypedPaceClient = ReturnType<typeof toTypedSupabase>;

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
 * Loads person, member, phones, and addresses for a delegated target after access RPC (PR08 / PR07 proxy path).
 */
export async function fetchDelegatedMemberProfileLoadModel(
  secure: SecureSupabase,
  client: TypedPaceClient,
  memberId: string
): Promise<MemberProfileLoadModel> {
  if (!secure || !client) {
    throw new Error('Member profile requires a secure client.');
  }

  const rpcResult = (await secure.rpc(
    // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern -- shared schema RPC name
    'check_user_pace_member_access_via_member_id',
    { p_member_id: memberId }
  )) as { data: boolean | null; error: Error | null };

  if (rpcResult.error) {
    throw new Error('Could not verify delegated access.');
  }
  if (rpcResult.data !== true) {
    throw new Error('Delegated access was denied.');
  }

  const { data: member, error: memberError } = await client
    .from('core_member')
    .select('*')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError || !member?.person_id) {
    throw new Error('Could not load member record.');
  }

  const [personRes, phonesRes] = await Promise.all([
    client.from('core_person').select('*').eq('id', member.person_id).maybeSingle(),
    client
      .from('core_phone')
      .select('*')
      .eq('person_id', member.person_id)
      .is('deleted_at', null),
  ]);

  const batchErr = personRes.error ?? phonesRes.error;
  if (batchErr) {
    throw new Error(batchErr.message || 'Could not load profile.');
  }
  if (!personRes.data) {
    throw new Error('Could not load person record.');
  }

  const person = personRes.data;
  const [resAddrRes, postAddrRes] = await Promise.all([
    person.residential_address_id
      ? client.from('core_address').select('*').eq('id', person.residential_address_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    person.postal_address_id && person.postal_address_id !== person.residential_address_id
      ? client.from('core_address').select('*').eq('id', person.postal_address_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const addrErr = resAddrRes.error ?? postAddrRes.error;
  if (addrErr) {
    throw new Error(addrErr.message || 'Could not load address details.');
  }

  return {
    person,
    member,
    phones: phonesRes.data ?? [],
    residentialAddress: resAddrRes.data,
    postalAddress: postAddrRes.data,
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
  const proxy = useProxyMode();

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;

  const awaitingProxyValidation = Boolean(proxy.targetMemberId && proxy.isValidating);
  const loadDelegated = proxy.isProxyActive && Boolean(proxy.targetMemberId);

  return useQuery({
    queryKey: [
      'memberProfile',
      'v2',
      userId,
      organisationId,
      loadDelegated ? proxy.targetMemberId : 'self',
    ],
    enabled: Boolean(client && userId && organisationId) && !awaitingProxyValidation,
    staleTime: 30_000,
    queryFn: async (): Promise<MemberProfileLoadModel | 'needs_setup'> => {
      if (!client || !userId || !organisationId) {
        throw new Error('Member profile requires organisation context.');
      }

      if (proxy.isProxyActive && proxy.targetMemberId) {
        return fetchDelegatedMemberProfileLoadModel(secure, client, proxy.targetMemberId);
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
