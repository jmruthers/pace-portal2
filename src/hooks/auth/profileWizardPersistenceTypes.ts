import type { AddressValue } from '@solvera/pace-core/forms';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import type { MemberProfileFormPhone, MemberProfileFormValues } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';

export type PaceMembershipStatus = Database['public']['Enums']['pace_membership_status'];

export type PersistWizardStep0Input = {
  db: SupabaseClient<Database>;
  organisationId: string;
  userId: string | null;
  personId: string;
  memberId: string | null;
  values: Pick<
    MemberProfileFormValues,
    'first_name' | 'last_name' | 'middle_name' | 'preferred_name' | 'email' | 'date_of_birth' | 'gender_id' | 'pronoun_id'
  >;
  existingMembershipStatus: PaceMembershipStatus | null;
};

export type PersistWizardStep1Values = {
  residential: AddressValue;
  postal_same_as_residential: boolean;
  postal?: AddressValue;
  phones: MemberProfileFormPhone[];
};

export type PersistWizardStep1Input = {
  db: SupabaseClient<Database>;
  organisationId: string;
  userId: string | null;
  personId: string;
  values: PersistWizardStep1Values;
  residentialRow: CoreAddressRow | null;
  postalRow: CoreAddressRow | null;
};

export type PersistWizardStep2Input = {
  db: SupabaseClient<Database>;
  userId: string | null;
  memberId: string;
  values: Pick<MemberProfileFormValues, 'membership_number' | 'membership_type_id'>;
  existingMembershipStatus: PaceMembershipStatus | null;
};
