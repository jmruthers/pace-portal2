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
const PROFILE_DEBUG_LOGS =
  import.meta.env.DEV || String(import.meta.env.VITE_PROFILE_DEBUG_LOGS ?? '') === 'true';

function profileDebugLog(step: string, data?: Record<string, unknown>): void {
  if (!PROFILE_DEBUG_LOGS) return;
  if (data) {
    console.info(`[member-profile][address] ${step}`, data);
    return;
  }
  console.info(`[member-profile][address] ${step}`);
}

function buildAddressPayload(
  value: AddressValue,
  _organisationId: string,
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

async function resolveExistingAddressByPlaceId(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  placeId: string
): Promise<ApiResult<string | null>> {
  const { data, error } = await client
    .from('core_address')
    .select('id')
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) {
    return err({
      code: 'ADDRESS_PLACE_LOOKUP',
      message: error.message || 'Could not resolve address for selected place.',
    });
  }

  return ok(data?.id ?? null);
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
      const existingByPlace = await resolveExistingAddressByPlaceId(client, payload.place_id);
      if (!isOk(existingByPlace)) {
        return existingByPlace;
      }
      const matchedId = existingByPlace.data;

      if (existingId) {
        if (matchedId && matchedId !== existingId) {
          profileDebugLog('address_update:reuse_by_place_id', {
            existingId,
            matchedId,
            placeId: payload.place_id,
            organisationId,
          });
          return ok(matchedId);
        }
        profileDebugLog('address_update:start', { addressId: existingId, organisationId });
        const updatePayload: AddressUpdate = {
          ...payload,
          updated_by: userId,
        };
        const { data: rows, error } = await client
          .from('core_address')
          .update(updatePayload)
          .select('id')
          .eq('id', existingId);
        if (error) {
          profileDebugLog('address_update:error', {
            addressId: existingId,
            organisationId,
            error: error.message,
          });
          return err({ code: 'ADDRESS_UPDATE', message: error.message || 'Could not update address.' });
        }
        profileDebugLog('address_update:done', {
          addressId: existingId,
          organisationId,
          rowsAffected: rows?.length ?? 0,
        });
        if (!rows || rows.length === 0) {
          return err({
            code: 'ADDRESS_UPDATE_NO_ROWS',
            message:
              'Address update was blocked by permissions. Contact support to enable member profile address updates.',
          });
        }
        return ok(existingId);
      }
      if (matchedId) {
        profileDebugLog('address_insert:reuse_by_place_id', {
          matchedId,
          placeId: payload.place_id,
          organisationId,
        });
        return ok(matchedId);
      }
      profileDebugLog('address_insert:start', { organisationId });
      const { data, error } = await client.from('core_address').insert(payload).select('id').single();
      if (error || !data?.id) {
        if (error?.code === '23505') {
          const duplicateLookup = await resolveExistingAddressByPlaceId(client, payload.place_id);
          if (isOk(duplicateLookup) && duplicateLookup.data) {
            profileDebugLog('address_insert:duplicate_reuse_by_place_id', {
              matchedId: duplicateLookup.data,
              placeId: payload.place_id,
              organisationId,
            });
            return ok(duplicateLookup.data);
          }
        }
        profileDebugLog('address_insert:error', {
          organisationId,
          error: error?.message ?? 'No row returned',
        });
        return err({
          code: 'ADDRESS_INSERT',
          message: error?.message || 'Could not save address.',
        });
      }
      profileDebugLog('address_insert:done', { organisationId, addressId: data.id });
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
          profileDebugLog('phone_soft_delete:start', { phoneId: oldId, personId: input.personId });
          const { data: softDeletedRows, error } = await client
            .from('core_phone')
            .update({ deleted_at: now, updated_at: now, updated_by: userId })
            .select('id')
            .eq('id', oldId)
            .eq('person_id', input.personId);
          if (error) {
            profileDebugLog('phone_soft_delete:error', {
              phoneId: oldId,
              personId: input.personId,
              error: error.message,
            });
            return err({ code: 'PHONE_SOFT_DELETE', message: error.message || 'Could not update phones.' });
          }
          profileDebugLog('phone_soft_delete:done', {
            phoneId: oldId,
            personId: input.personId,
            rowsAffected: softDeletedRows?.length ?? 0,
          });
          if (!softDeletedRows || softDeletedRows.length === 0) {
            return err({
              code: 'PHONE_SOFT_DELETE_NO_ROWS',
              message:
                'Phone update was blocked by permissions. Contact support to enable member profile phone updates.',
            });
          }
        }
      }

      for (const row of input.phones) {
        if (row.id) {
          profileDebugLog('phone_update:start', { phoneId: row.id, personId: input.personId });
          const { data: updatedRows, error } = await client
            .from('core_phone')
            .update({
              phone_number: row.phone_number.trim(),
              phone_type_id: row.phone_type_id,
              updated_at: now,
              updated_by: userId,
            })
            .select('id')
            .eq('id', row.id)
            .eq('person_id', input.personId);
          if (error) {
            profileDebugLog('phone_update:error', {
              phoneId: row.id,
              personId: input.personId,
              error: error.message,
            });
            return err({ code: 'PHONE_UPDATE', message: error.message || 'Could not update phone.' });
          }
          profileDebugLog('phone_update:done', {
            phoneId: row.id,
            personId: input.personId,
            rowsAffected: updatedRows?.length ?? 0,
          });
          if (!updatedRows || updatedRows.length === 0) {
            return err({
              code: 'PHONE_UPDATE_NO_ROWS',
              message:
                'Phone update was blocked by permissions. Contact support to enable member profile phone updates.',
            });
          }
        } else {
          profileDebugLog('phone_insert:start', { personId: input.personId });
          const { error } = await client.from('core_phone').insert({
            person_id: input.personId,
            phone_number: row.phone_number.trim(),
            phone_type_id: row.phone_type_id,
            created_by: userId,
            updated_by: userId,
          });
          if (error) {
            profileDebugLog('phone_insert:error', {
              personId: input.personId,
              error: error.message,
            });
            return err({ code: 'PHONE_INSERT', message: error.message || 'Could not add phone.' });
          }
          profileDebugLog('phone_insert:done', { personId: input.personId });
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
      profileDebugLog('save_addresses_phones:start', {
        personId: input.personId,
        organisationId: input.organisationId,
        existingPhoneIds: input.existingPhoneIds.length,
        submittedPhones: input.phones.length,
      });
      const resIdResult = await upsertAddress(
        input.residential,
        input.organisationId,
        input.residentialId
      );
      if (!isOk(resIdResult)) {
        profileDebugLog('save_addresses_phones:error', {
          personId: input.personId,
          organisationId: input.organisationId,
          code: resIdResult.error.code,
          message: resIdResult.error.message,
        });
        throw new Error(`${resIdResult.error.code}: ${resIdResult.error.message}`);
      }
      let postalId = input.postalId;
      if (!input.postalSameAsResidential && input.postal) {
        const postalResult = await upsertAddress(input.postal, input.organisationId, input.postalId);
        if (!isOk(postalResult)) {
          profileDebugLog('save_addresses_phones:error', {
            personId: input.personId,
            organisationId: input.organisationId,
            code: postalResult.error.code,
            message: postalResult.error.message,
          });
          throw new Error(`${postalResult.error.code}: ${postalResult.error.message}`);
        }
        postalId = postalResult.data;
      } else {
        postalId = resIdResult.data;
      }
      const phoneResult = await syncPhones({
        personId: input.personId,
        phones: input.phones,
        existingPhoneIds: input.existingPhoneIds,
      });
      if (!isOk(phoneResult)) {
        profileDebugLog('save_addresses_phones:error', {
          personId: input.personId,
          organisationId: input.organisationId,
          code: phoneResult.error.code,
          message: phoneResult.error.message,
        });
        throw new Error(`${phoneResult.error.code}: ${phoneResult.error.message}`);
      }
      profileDebugLog('save_addresses_phones:done', {
        personId: input.personId,
        organisationId: input.organisationId,
        residentialAddressId: resIdResult.data,
        postalAddressId: postalId,
      });
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
