import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type CoreAddressRow = Database['public']['Tables']['core_address']['Row'];

export type AddressDataModel = {
  /** Residential address linked from `core_person.residential_address_id`, when present. */
  residential: CoreAddressRow | null;
  /** Postal address linked from `core_person.postal_address_id`, when present. */
  postal: CoreAddressRow | null;
  /**
   * True when a linked id is present but the row is still loading, failed to load, or incomplete for shell checks.
   * PR06 uses form validation for saves; this supports preload / prefill completeness.
   */
  isUnresolved: boolean;
};

function rowLooksComplete(row: CoreAddressRow | null): boolean {
  if (row == null) {
    return false;
  }
  const hasLabel =
    (row.full_address != null && String(row.full_address).trim() !== '') ||
    (row.place_id != null && String(row.place_id).trim() !== '');
  return hasLabel;
}

/**
 * Loads `core_address` rows for residential and/or postal ids (deduped fetch when both ids match).
 */
export function usePersonAddresses(residentialId: string | null, postalId: string | null) {
  const secure = useSecureSupabase();
  const db = toTypedSupabase(secure);

  const uniqueIds = useMemo(
    () =>
      [...new Set([residentialId, postalId].filter((x): x is string => x != null && x !== ''))].sort(),
    [residentialId, postalId]
  );

  const query = useQuery({
    queryKey: ['profileWizardAddresses', 'v2', ...uniqueIds.sort()],
    enabled: Boolean(db && uniqueIds.length > 0),
    staleTime: 30_000,
    queryFn: async (): Promise<{ residential: CoreAddressRow | null; postal: CoreAddressRow | null }> => {
      if (!db || uniqueIds.length === 0) {
        throw new Error('Address data requires at least one address id.');
      }
      const res = await db.from('core_address').select('*').in('id', uniqueIds);
      if (res.error) {
        throw new Error(res.error.message || 'Could not load addresses.');
      }
      const rows = res.data ?? [];
      const byId = Object.fromEntries(rows.map((r) => [r.id, r])) as Record<string, CoreAddressRow>;
      return {
        residential: residentialId != null ? byId[residentialId] ?? null : null,
        postal: postalId != null ? byId[postalId] ?? null : null,
      };
    },
  });

  const addressData: AddressDataModel = useMemo(() => {
    if (uniqueIds.length === 0) {
      return { residential: null, postal: null, isUnresolved: false };
    }
    if (query.isLoading) {
      return { residential: null, postal: null, isUnresolved: true };
    }
    if (query.isError) {
      return { residential: null, postal: null, isUnresolved: true };
    }
    const residential = query.data?.residential ?? null;
    const postal = query.data?.postal ?? null;
    const resOk = residentialId == null || rowLooksComplete(residential);
    const postOk = postalId == null || rowLooksComplete(postal);
    return {
      residential,
      postal,
      isUnresolved: !resOk || !postOk,
    };
  }, [
    uniqueIds,
    query.isLoading,
    query.isError,
    query.data,
    residentialId,
    postalId,
  ]);

  return {
    ...query,
    addressData,
  };
}

/**
 * @deprecated Prefer {@link usePersonAddresses} for profile flows with residential/postal split.
 * Loads a single address row by id (legacy shell helper).
 */
export function useAddressData(personAddressId: string | null) {
  const dual = usePersonAddresses(personAddressId, null);
  return {
    ...dual,
    addressData: {
      residential: dual.addressData.residential,
      postal: null,
      isUnresolved: dual.addressData.isUnresolved,
    },
  };
}
