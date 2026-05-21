import { useEffect, useMemo } from 'react';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import { buildMemberProfileFormDefaults } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import type { MemberProfileFormValues } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import type { CorePhoneRow } from '@/hooks/contacts/usePhoneNumbers';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';
import type { Database } from '@/types/pace-database';

type PersonRow = Database['public']['Tables']['core_person']['Row'] | null;
type MemberRow = Database['public']['Tables']['core_member']['Row'] | null;

export function useProfileWizardFormPrefill(args: {
  form: UseFormReturn<MemberProfileFormValues>;
  personMemberQueryLoading: boolean;
  personId: string | null;
  phonesQueryLoading: boolean;
  addressQueryLoading: boolean;
  hasAddressIds: boolean;
  person: PersonRow;
  member: MemberRow;
  phones: CorePhoneRow[];
  residential: CoreAddressRow | null;
  postal: CoreAddressRow | null;
}) {
  const {
    form: { reset },
    personMemberQueryLoading,
    personId,
    phonesQueryLoading,
    addressQueryLoading,
    hasAddressIds,
    person,
    member,
    phones,
    residential,
    postal,
  } = args;

  const profilePrefillKey = useMemo(() => {
    const phoneSig = phones.map((p) => `${p.id}:${p.phone_number ?? ''}`).join('|');
    return [
      person?.id ?? '',
      member?.id ?? '',
      member?.updated_at ?? '',
      phoneSig,
      residential?.id ?? '',
      postal?.id ?? '',
      residential?.updated_at ?? '',
      postal?.updated_at ?? '',
    ].join('\u001f');
  }, [
    person?.id,
    member?.id,
    member?.updated_at,
    phones,
    residential?.id,
    postal?.id,
    residential?.updated_at,
    postal?.updated_at,
  ]);

  const formDefaults = useMemo(
    () =>
      buildMemberProfileFormDefaults({
        person,
        member,
        phones,
        residential,
        postal,
      }),
    // profilePrefillKey fingerprints row/phone/address data; raw query row refs are unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on profilePrefillKey only
    [profilePrefillKey]
  );

  useEffect(() => {
    if (personMemberQueryLoading) {
      return;
    }
    if (personId != null && phonesQueryLoading) {
      return;
    }
    if (hasAddressIds && addressQueryLoading) {
      return;
    }
    reset(formDefaults);
  }, [
    formDefaults,
    personMemberQueryLoading,
    hasAddressIds,
    personId,
    phonesQueryLoading,
    addressQueryLoading,
    reset,
  ]);

  return profilePrefillKey;
}
