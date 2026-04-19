import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type MediConditionTypeRow = Database['public']['Tables']['medi_condition_type']['Row'];

/**
 * Condition types for hierarchical selection (includes inactive so existing records render labels correctly).
 */
export function useMediConditionTypes() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['mediConditionTypes', 'all', 'v1'],
    enabled: Boolean(client),
    staleTime: 300_000,
    queryFn: async (): Promise<MediConditionTypeRow[]> => {
      if (!client) throw new Error('Not authenticated.');
      const q = await client.from('medi_condition_type').select('*').order('name');
      if (q.error) throw new Error(q.error.message ?? 'Could not load condition types.');
      return (q.data ?? []) as MediConditionTypeRow[];
    },
  });
}
