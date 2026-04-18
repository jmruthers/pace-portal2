import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { FileReference } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  coreFileRowToFileReference,
  fetchCurrentActionPlan,
} from '@/hooks/medical-profile/actionPlanOperations';
import type { Database } from '@/types/pace-database';

export type MediActionPlanRow = Database['public']['Tables']['medi_action_plan']['Row'];

export type ActionPlanFileState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; actionPlan: MediActionPlanRow; fileReference: FileReference | null }
  | { status: 'error'; message: string };

/**
 * PR11 — current action-plan row + `FileReference` for `FileDisplay` (if linked).
 */
export function useActionPlanForCondition(conditionId: string | null) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['mediActionPlan', 'v1', conditionId],
    enabled: Boolean(client && conditionId),
    queryFn: async (): Promise<{ actionPlan: MediActionPlanRow | null; fileReference: FileReference | null }> => {
      if (!client || !conditionId) {
        return { actionPlan: null, fileReference: null };
      }
      const ap = await fetchCurrentActionPlan(client, conditionId);
      if (!ap) {
        return { actionPlan: null, fileReference: null };
      }
      if (!ap.file_reference_id) {
        return { actionPlan: ap, fileReference: null };
      }
      const ref = await client
        .from('core_file_references')
        .select('*')
        .eq('id', ap.file_reference_id)
        .maybeSingle();
      if (ref.error || !ref.data) {
        return { actionPlan: ap, fileReference: null };
      }
      return {
        actionPlan: ap,
        fileReference: coreFileRowToFileReference(ref.data, ap.id),
      };
    },
  });
}
