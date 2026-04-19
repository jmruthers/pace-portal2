import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAttachment } from '@solvera/pace-core/crud';
import { isErr } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase, toSupabaseClientLike } from '@/lib/supabase-typed';
import type { MedicalConditionFormValues } from '@/utils/medical-profile/medicalConditionValidation';

type MediInsert = Database['public']['Tables']['medi_condition']['Insert'];
type MediUpdate = Database['public']['Tables']['medi_condition']['Update'];

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToInsert(
  profileId: string,
  values: MedicalConditionFormValues
): MediInsert {
  return {
    profile_id: profileId,
    condition_type_id: values.condition_type_id,
    name: emptyToNull(values.name),
    severity: values.severity ?? null,
    medical_alert: values.medical_alert,
    diagnosed_by: emptyToNull(values.diagnosed_by),
    diagnosed_date: emptyToNull(values.diagnosed_date),
    treatment: emptyToNull(values.treatment),
    medications_and_aids: emptyToNull(values.medications_and_aids),
    triggers: emptyToNull(values.triggers),
    emergency_protocol: emptyToNull(values.emergency_protocol),
    notes: emptyToNull(values.notes),
    action_plan_date: emptyToNull(values.action_plan_date),
    is_active: values.is_active,
  };
}

function formToUpdate(values: MedicalConditionFormValues): MediUpdate {
  return {
    condition_type_id: values.condition_type_id,
    name: emptyToNull(values.name),
    severity: values.severity ?? null,
    medical_alert: values.medical_alert,
    diagnosed_by: emptyToNull(values.diagnosed_by),
    diagnosed_date: emptyToNull(values.diagnosed_date),
    treatment: emptyToNull(values.treatment),
    medications_and_aids: emptyToNull(values.medications_and_aids),
    triggers: emptyToNull(values.triggers),
    emergency_protocol: emptyToNull(values.emergency_protocol),
    notes: emptyToNull(values.notes),
    action_plan_date: emptyToNull(values.action_plan_date),
    is_active: values.is_active,
  };
}

export function useMedicalConditions(input: {
  profileId: string | null;
  organisationId: string | null;
}) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const supabaseLike = toSupabaseClientLike(secure);
  const queryClient = useQueryClient();

  const createCondition = useMutation({
    mutationFn: async (values: MedicalConditionFormValues) => {
      if (!client || !input.profileId || !input.organisationId) {
        throw new Error('Cannot save condition without profile and organisation.');
      }
      const row = formToInsert(input.profileId, values);
      const ins = await client.from('medi_condition').insert(row).select('id').single();
      if (ins.error || !ins.data?.id) {
        throw new Error(ins.error?.message ?? 'Could not create condition.');
      }
      return ins.data.id as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
    },
  });

  const updateCondition = useMutation({
    mutationFn: async (inputRow: { id: string; values: MedicalConditionFormValues }) => {
      if (!client) throw new Error('Not authenticated.');
      const upd = await client
        .from('medi_condition')
        .update(formToUpdate(inputRow.values))
        .eq('id', inputRow.id)
        .select('id')
        .single();
      if (upd.error) throw new Error(upd.error.message ?? 'Could not update condition.');
      return inputRow.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
    },
  });

  const deleteCondition = useMutation({
    mutationFn: async (conditionId: string) => {
      if (!client || !secure || !supabaseLike) throw new Error('Not authenticated.');
      const condition = await client
        .from('medi_condition')
        .select('action_plan_file_id')
        .eq('id', conditionId)
        .maybeSingle();
      if (condition.error) {
        throw new Error(condition.error.message ?? 'Could not load condition before delete.');
      }

      const fileReferenceId = condition.data?.action_plan_file_id ?? null;
      if (fileReferenceId) {
        const refRow = await client
          .from('core_file_references')
          .select('file_path')
          .eq('id', fileReferenceId)
          .maybeSingle();
        const filePath = refRow.data?.file_path ?? null;

        const unlink = await client
          .from('medi_condition')
          .update({ action_plan_file_id: null })
          .eq('id', conditionId)
          .select('id');
        if (unlink.error) {
          throw new Error(unlink.error.message ?? 'Could not unlink action plan file.');
        }
        const unlinkedRows = Array.isArray(unlink.data) ? unlink.data.length : 0;
        if (unlinkedRows !== 1) {
          throw new Error('Could not unlink action plan file: condition update was not permitted.');
        }

        if (filePath) {
          const del = await deleteAttachment({
            secureClient: secure,
            adapter: {
              metadataTable: 'core_file_references',
              storageBucket: 'files',
              columns: {
                id: 'id',
                filePath: 'file_path',
                relationId: 'record_id',
                relationTable: 'table_name',
              },
            },
            metadataId: fileReferenceId,
            filePath,
            continueOnStorageFailure: true,
          });
          if (isErr(del) && import.meta.env.DEV) {
            console.warn('pace-portal: action plan file delete', del.error.message);
          }
        } else {
          await client.from('core_file_references').delete().eq('id', fileReferenceId);
        }
      }
      const del = await client.from('medi_condition').delete().eq('id', conditionId).select('id');
      if (del.error) throw new Error(del.error.message ?? 'Could not delete condition.');
      const deletedRows = Array.isArray(del.data) ? del.data.length : 0;
      if (deletedRows !== 1) {
        throw new Error('Could not delete condition: no rows were deleted.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
    },
  });

  return {
    createCondition,
    updateCondition,
    deleteCondition,
    isReady: Boolean(client && input.profileId),
  };
}
