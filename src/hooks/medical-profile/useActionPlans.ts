import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { FileReference } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';

/**
 * Loads the current condition's linked action-plan file reference.
 */
export function useActionPlanForCondition(conditionId: string | null) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['mediActionPlan', 'v1', conditionId],
    enabled: Boolean(client && conditionId),
    queryFn: async (): Promise<{ actionPlanDate: string | null; fileReference: FileReference | null }> => {
      if (!client || !conditionId) {
        return { actionPlanDate: null, fileReference: null };
      }
      const condition = await client
        .from('medi_condition')
        .select('action_plan_file_id, action_plan_date')
        .eq('id', conditionId)
        .maybeSingle();
      if (condition.error || !condition.data) {
        return { actionPlanDate: null, fileReference: null };
      }
      if (!condition.data.action_plan_file_id) {
        return { actionPlanDate: condition.data.action_plan_date ?? null, fileReference: null };
      }

      const ref = await client
        .from('core_file_references')
        .select('*')
        .eq('id', condition.data.action_plan_file_id)
        .maybeSingle();
      if (ref.error || !ref.data) {
        return { actionPlanDate: condition.data.action_plan_date ?? null, fileReference: null };
      }
      return {
        actionPlanDate: condition.data.action_plan_date ?? null,
        fileReference: {
          id: ref.data.id,
          table_name: 'medi_condition',
          record_id: conditionId,
          file_path: ref.data.file_path,
          file_metadata:
            ref.data.file_metadata != null && typeof ref.data.file_metadata === 'object'
              ? (ref.data.file_metadata as FileReference['file_metadata'])
              : { fileName: 'document', fileType: 'application/octet-stream' },
          app_id: ref.data.app_id,
          is_public: ref.data.is_public === true,
          created_at: ref.data.created_at ?? '',
          updated_at: ref.data.updated_at ?? '',
        },
      };
    },
  });
}
