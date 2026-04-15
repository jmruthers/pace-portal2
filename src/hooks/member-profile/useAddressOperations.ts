import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { AddressValue } from '@solvera/pace-core/forms';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { MemberProfileFormPhone } from '@/utils/member-profile/validation';

type AddressInsert = Database['public']['Tables']['core_address']['Insert'];
type AddressUpdate = Database['public']['Tables']['core_address']['Update'];

function buildAddressPayload(
  value: AddressValue,
  organisationId: string,
  userId: string | null
): Omit<AddressInsert, 'id'> {
  const placeId =
    value.placeId && value.placeId.trim() !== ''
      ? value.placeId.trim()
      : `manual-${crypto.randomUUID()}`;
  const full =
    value.formattedAddress?.trim() ||
    [value.line1, value.locality, value.region, value.postalCode, value.countryCode]
      .filter((p) => p != null && String(p).trim() !== '')
      .join(', ');
  return {
    place_id: placeId,
    organisation_id: organisationId,
    full_address: full.length > 0 ? full : null,
    street_number: null,
    route: value.line1.trim(),
    suburb: value.locality.trim(),
    state: value.region?.trim() ?? null,
    postcode: value.postalCode?.trim() ?? null,
    country: value.countryCode.trim(),
    created_by: userId,
    updated_by: userId,
  };
}

export type SyncPhonesInput = {
  personId: string;
  phones: MemberProfileFormPhone[];
  existingPhoneIds: string[];
};

/**
 * Upserts `core_address` from structured address values and syncs phone rows (replacement semantics).
 */
export function useAddressOperations() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const { user } = useUnifiedAuthContext();
  const userId = user?.id ?? null;

  const upsertAddress = async (
    value: AddressValue,
    organisationId: string,
    existingId: string | null
  ): Promise<ApiResult<string>> => {
    try {
      if (!client) {
        return err({ code: 'ADDRESS_NO_CLIENT', message: 'Client is not available.' });
      }
      const payload = buildAddressPayload(value, organisationId, userId);
      if (existingId) {
        const updatePayload: AddressUpdate = {
          ...payload,
          updated_by: userId,
        };
        const { error } = await client.from('core_address').update(updatePayload).eq('id', existingId);
        if (error) {
          return err({ code: 'ADDRESS_UPDATE', message: error.message || 'Could not update address.' });
        }
        return ok(existingId);
      }
      const { data, error } = await client.from('core_address').insert(payload).select('id').single();
      if (error || !data?.id) {
        return err({
          code: 'ADDRESS_INSERT',
          message: error?.message || 'Could not save address.',
        });
      }
      return ok(data.id);
    } catch (e) {
      return err(normalizeToApiError(e, 'ADDRESS', 'Could not save address.'));
    }
  };

  const syncPhones = async (input: SyncPhonesInput): Promise<ApiResult<void>> => {
    try {
      if (!client) {
        return err({ code: 'PHONE_NO_CLIENT', message: 'Client is not available.' });
      }
      const now = new Date().toISOString();
      const keptIds = new Set(input.phones.map((p) => p.id).filter(Boolean) as string[]);

      for (const oldId of input.existingPhoneIds) {
        if (!keptIds.has(oldId)) {
          const { error } = await client
            .from('core_phone')
            .update({ deleted_at: now, updated_at: now, updated_by: userId })
            .eq('id', oldId)
            .eq('person_id', input.personId);
          if (error) {
            return err({ code: 'PHONE_SOFT_DELETE', message: error.message || 'Could not update phones.' });
          }
        }
      }

      for (const row of input.phones) {
        if (row.id) {
          const { error } = await client
            .from('core_phone')
            .update({
              phone_number: row.phone_number.trim(),
              phone_type_id: row.phone_type_id,
              updated_at: now,
              updated_by: userId,
            })
            .eq('id', row.id)
            .eq('person_id', input.personId);
          if (error) {
            return err({ code: 'PHONE_UPDATE', message: error.message || 'Could not update phone.' });
          }
        } else {
          const { error } = await client.from('core_phone').insert({
            person_id: input.personId,
            phone_number: row.phone_number.trim(),
            phone_type_id: row.phone_type_id,
            created_by: userId,
            updated_by: userId,
          });
          if (error) {
            return err({ code: 'PHONE_INSERT', message: error.message || 'Could not add phone.' });
          }
        }
      }

      return ok(undefined);
    } catch (e) {
      return err(normalizeToApiError(e, 'PHONE', 'Could not save phones.'));
    }
  };

  const mutation = useMutation({
    mutationFn: async (input: {
      organisationId: string;
      residential: AddressValue;
      postal: AddressValue | null;
      postalSameAsResidential: boolean;
      residentialId: string | null;
      postalId: string | null;
      personId: string;
      phones: MemberProfileFormPhone[];
      existingPhoneIds: string[];
    }) => {
      const resIdResult = await upsertAddress(
        input.residential,
        input.organisationId,
        input.residentialId
      );
      if (!isOk(resIdResult)) throw new Error(resIdResult.error.message);
      let postalId = input.postalId;
      if (!input.postalSameAsResidential && input.postal) {
        const postalResult = await upsertAddress(input.postal, input.organisationId, input.postalId);
        if (!isOk(postalResult)) throw new Error(postalResult.error.message);
        postalId = postalResult.data;
      } else {
        postalId = resIdResult.data;
      }
      const phoneResult = await syncPhones({
        personId: input.personId,
        phones: input.phones,
        existingPhoneIds: input.existingPhoneIds,
      });
      if (!isOk(phoneResult)) throw new Error(phoneResult.error.message);
      return { residentialAddressId: resIdResult.data, postalAddressId: postalId };
    },
  });

  return {
    upsertAddress,
    syncPhones,
    saveAddressesAndPhones: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
