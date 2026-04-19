import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type CorePhoneRow = Database['public']['Tables']['core_phone']['Row'];

/**
 * Loads non-deleted phone rows for a person. PR05 shell preload; PR06 owns editing.
 */
export function usePhoneNumbers(personId: string | null) {
  const secure = useSecureSupabase();
  const db = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['profileWizardPhones', 'v1', personId],
    enabled: Boolean(db && personId),
    staleTime: 30_000,
    queryFn: async (): Promise<CorePhoneRow[]> => {
      if (!db || !personId) {
        throw new Error('Phone numbers require person context.');
      }
      const res = await db
        .from('core_phone')
        .select('*')
        .eq('person_id', personId)
        .is('deleted_at', null);
      if (res.error) {
        throw new Error(res.error.message || 'Could not load phone numbers.');
      }
      return res.data ?? [];
    },
  });
}
