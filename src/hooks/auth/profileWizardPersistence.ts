/* eslint-disable pace-core-compliance/max-named-exports -- PR06 persistence surface is intentionally grouped; split only if it grows further. */
import type { AddressValue } from '@solvera/pace-core/forms';
import { createErrorResult, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import {
  addressValueToCoreAddressPayload,
  isAddressValueEmpty,
  type CoreAddressWritePayload,
} from '@/components/member-profile/MemberProfile/addressMapping';
import type { MemberProfileFormPhone, MemberProfileFormValues } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';
import { normalizeMembershipStatus } from '@/hooks/member-profile/usePersonOperations';

export type PaceMembershipStatus = Database['public']['Enums']['pace_membership_status'];

/**
 * Same normalization as self-service member profile saves (PR06 / PR07).
 */
export function normalizeMembershipStatusForSave(
  current: PaceMembershipStatus | null | undefined
): PaceMembershipStatus {
  return normalizeMembershipStatus(current, null);
}

function mergeAddressPayload(
  base: CoreAddressWritePayload,
  existing: CoreAddressRow | null
): CoreAddressWritePayload {
  if (existing == null) {
    return base;
  }
  return {
    ...base,
    lat: existing.lat,
    lng: existing.lng,
    street_number: existing.street_number,
    route: existing.route,
  };
}

/**
 * Persists or updates a `core_address` row, reusing `existingRowId` when provided.
 * Manual entries without a Google `placeId` reuse the row's `place_id` when updating in place.
 */
export async function upsertAddressFromValue(
  db: SupabaseClient<Database>,
  _organisationId: string,
  value: AddressValue,
  existingRow: CoreAddressRow | null,
  userId: string | null
): Promise<{ id: string }> {
  const syntheticPlace =
    existingRow != null && existingRow.place_id.startsWith('manual:') ? existingRow.place_id : undefined;
  const payload = mergeAddressPayload(
    addressValueToCoreAddressPayload(value, { existingPlaceId: syntheticPlace }),
    existingRow
  );

  const audit = {
    updated_by: userId,
  };

  if (existingRow != null) {
    const res = await db
      .from('core_address')
      .update({
        ...payload,
        ...audit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id);

    if (res.error) {
      throw new Error(res.error.message || 'Could not update address.');
    }
    return { id: existingRow.id };
  }

  const ins = await db
    .from('core_address')
    .insert({
      ...payload,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single();

  if (ins.error) {
    throw new Error(ins.error.message || 'Could not create address.');
  }
  if (!ins.data?.id) {
    throw new Error('Address insert did not return an id.');
  }
  return { id: ins.data.id };
}

/**
 * Soft-deletes existing active phones for the person and inserts the new set.
 */
export async function replacePersonPhones(
  db: SupabaseClient<Database>,
  personId: string,
  phones: MemberProfileFormPhone[],
  userId: string | null
): Promise<ApiResult<void>> {
  const active = await db
    .from('core_phone')
    .select('id')
    .eq('person_id', personId)
    .is('deleted_at', null);

  if (active.error) {
    return createErrorResult('PHONE_READ', active.error.message || 'Could not read phone numbers.');
  }

  const now = new Date().toISOString();
  for (const row of active.data ?? []) {
    const del = await db
      .from('core_phone')
      .update({ deleted_at: now, updated_by: userId, updated_at: now })
      .eq('id', row.id);
    if (del.error) {
      return createErrorResult('PHONE_SOFT_DELETE', del.error.message || 'Could not update a phone number.');
    }
  }

  const toInsert = phones.filter((p) => p.phone_number.trim() !== '');
  for (const p of toInsert) {
    const insertPayload: Database['public']['Tables']['core_phone']['Insert'] = {
      person_id: personId,
      phone_number: p.phone_number.trim(),
      phone_type_id: p.phone_type_id,
      created_by: userId,
      updated_by: userId,
    };
    const ins = await db.from('core_phone').insert(insertPayload);
    if (ins.error) {
      return createErrorResult('PHONE_INSERT', ins.error.message || 'Could not save a phone number.');
    }
  }

  return ok(undefined);
}

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

export async function persistProfileWizardStep0(input: PersistWizardStep0Input): Promise<{ memberId: string | null }> {
  const {
    db,
    organisationId,
    userId,
    personId,
    memberId,
    values,
    existingMembershipStatus,
  } = input;

  const pRes = await db
    .from('core_person')
    .update({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      middle_name:
        values.middle_name != null && values.middle_name.trim() !== '' ? values.middle_name.trim() : null,
      preferred_name:
        values.preferred_name != null && values.preferred_name.trim() !== ''
          ? values.preferred_name.trim()
          : null,
      email: values.email.trim(),
      date_of_birth: values.date_of_birth,
      gender_id: values.gender_id,
      pronoun_id: values.pronoun_id,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId);

  if (pRes.error) {
    throw new Error(pRes.error.message || 'Could not save personal details.');
  }

  /** Resolve existing `core_member` by id or org+person; otherwise step 0 inserts a row when permitted. */
  let effectiveMemberId = memberId;
  let membershipStatusSource: PaceMembershipStatus | null | undefined = existingMembershipStatus;
  if (effectiveMemberId == null) {
    const existing = await db
      .from('core_member')
      .select('id, membership_status')
      .eq('organisation_id', organisationId)
      .eq('person_id', personId)
      .maybeSingle();

    if (existing.error) {
      throw new Error(existing.error.message || 'Could not verify membership.');
    }
    if (existing.data?.id != null) {
      effectiveMemberId = existing.data.id;
      if (existingMembershipStatus == null && existing.data.membership_status != null) {
        membershipStatusSource = existing.data.membership_status;
      }
    }
  }

  const membership_status = normalizeMembershipStatusForSave(membershipStatusSource);

  if (effectiveMemberId == null) {
    const insertPayload: Database['public']['Tables']['core_member']['Insert'] = {
      organisation_id: organisationId,
      person_id: personId,
      membership_status,
      created_by: userId,
      updated_by: userId,
    };
    const ins = await db.from('core_member').insert(insertPayload).select('id').maybeSingle();

    if (ins.data?.id != null) {
      return { memberId: ins.data.id };
    }

    /** Duplicate insert or RLS: re-resolve the row so membership status can still be applied via update. */
    const recovered = await db
      .from('core_member')
      .select('id, membership_status')
      .eq('organisation_id', organisationId)
      .eq('person_id', personId)
      .maybeSingle();

    if (recovered.data?.id != null) {
      effectiveMemberId = recovered.data.id;
      if (existingMembershipStatus == null && recovered.data.membership_status != null) {
        membershipStatusSource = recovered.data.membership_status;
      }
    } else if (ins.error != null) {
      throw new Error(
        ins.error.message ||
          'Could not create a membership record for this organisation.'
      );
    } else {
      throw new Error('Could not create a membership record for this organisation.');
    }
  }

  if (effectiveMemberId == null) {
    throw new Error('Could not resolve a membership record for this person.');
  }

  const mRes = await db
    .from('core_member')
    .update({
      membership_status: normalizeMembershipStatusForSave(membershipStatusSource),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', effectiveMemberId);

  if (mRes.error) {
    throw new Error(mRes.error.message || 'Could not save member details.');
  }
  return { memberId: effectiveMemberId };
}

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

export async function persistProfileWizardStep1(input: PersistWizardStep1Input): Promise<void> {
  const { db, organisationId, userId, personId, values, residentialRow, postalRow } = input;

  const residentialResult = await upsertAddressFromValue(
    db,
    organisationId,
    values.residential,
    residentialRow,
    userId
  );

  let postalId: string | null = null;
  if (values.postal_same_as_residential) {
    postalId = residentialResult.id;
  } else if (values.postal != null && !isAddressValueEmpty(values.postal)) {
    const pid = await upsertAddressFromValue(db, organisationId, values.postal, postalRow, userId);
    postalId = pid.id;
  }

  const perRes = await db
    .from('core_person')
    .update({
      residential_address_id: residentialResult.id,
      postal_address_id: postalId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId);

  if (perRes.error) {
    throw new Error(perRes.error.message || 'Could not link addresses.');
  }

  const phonesRes = await replacePersonPhones(db, personId, values.phones, userId);
  if (!phonesRes.ok) {
    throw new Error(phonesRes.error.message);
  }
}

export type PersistWizardStep2Input = {
  db: SupabaseClient<Database>;
  userId: string | null;
  memberId: string;
  values: Pick<MemberProfileFormValues, 'membership_number' | 'membership_type_id'>;
  existingMembershipStatus: PaceMembershipStatus | null;
};

export async function persistProfileWizardStep2(input: PersistWizardStep2Input): Promise<void> {
  const { db, userId, memberId, values, existingMembershipStatus } = input;

  const membership_status = normalizeMembershipStatusForSave(existingMembershipStatus);

  const mRes = await db
    .from('core_member')
    .update({
      membership_number: values.membership_number?.trim() !== '' ? values.membership_number!.trim() : null,
      membership_type_id: values.membership_type_id,
      membership_status,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (mRes.error) {
    throw new Error(mRes.error.message || 'Could not save membership details.');
  }
}
