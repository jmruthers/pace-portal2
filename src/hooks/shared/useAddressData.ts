import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type CoreAddressRow = Database['public']['Tables']['core_address']['Row'];

export type AddressDataModel = {
  /** Residential address linked from `core_person.address_id`, when present. */
  residential: CoreAddressRow | null;
  /**
   * True when no address is linked, still loading, failed to load, or incomplete for shell checks.
   * PR06 refines field-level behaviour.
   */
  isUnresolved: boolean;
};

/**
 * Loads the person's linked residential address. PR05 shell preload; PR06 owns postal split and editing.
 */
export function useAddressData(personAddressId: string | null) {
  const secure = useSecureSupabase();
  const db = toTypedSupabase(secure);

  const query = useQuery({
    queryKey: ['profileWizardAddress', 'v1', personAddressId],
    enabled: Boolean(db && personAddressId),
    staleTime: 30_000,
    queryFn: async (): Promise<CoreAddressRow | null> => {
      if (!db || !personAddressId) {
        throw new Error('Address data requires an address id.');
      }
      const res = await db.from('core_address').select('*').eq('id', personAddressId).maybeSingle();
      if (res.error) {
        throw new Error(res.error.message || 'Could not load address.');
      }
      return res.data;
    },
  });

  const addressData: AddressDataModel = (() => {
    if (personAddressId == null) {
      return { residential: null, isUnresolved: true };
    }
    if (query.isLoading) {
      return { residential: null, isUnresolved: true };
    }
    if (query.isError) {
      return { residential: null, isUnresolved: true };
    }
    const residential = query.data ?? null;
    if (residential == null) {
      return { residential: null, isUnresolved: true };
    }
    const hasLabel =
      (residential.full_address != null && String(residential.full_address).trim() !== '') ||
      (residential.place_id != null && String(residential.place_id).trim() !== '');
    return {
      residential,
      isUnresolved: !hasLabel,
    };
  })();

  return {
    ...query,
    addressData,
  };
}
