import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase, toSupabaseClientLike } from '@/lib/supabase-typed';
import { deleteActionPlansForCondition } from '@/hooks/medical-profile/actionPlanOperations';
import type { MedicalConditionFormValues } from '@/utils/medical-profile/medicalConditionValidation';

type MediInsert = Database['public']['Tables']['medi_condition']['Insert'];
type MediUpdate = Database['public']['Tables']['medi_condition']['Update'];

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToInsert(
  profileId: string,
  organisationId: string,
  values: MedicalConditionFormValues
): MediInsert {
  return {
    profile_id: profileId,
    organisation_id: organisationId,
    condition_type_id: values.condition_type_id,
    custom_name: emptyToNull(values.custom_name),
    name: emptyToNull(values.name),
    severity: values.severity ?? null,
    medical_alert: values.medical_alert,
    alert_description: emptyToNull(values.alert_description),
    diagnosed_by: emptyToNull(values.diagnosed_by),
    diagnosed_date: emptyToNull(values.diagnosed_date),
    last_episode_date: emptyToNull(values.last_episode_date),
    treatment: emptyToNull(values.treatment),
    medication: emptyToNull(values.medication),
    triggers: emptyToNull(values.triggers),
    emergency_protocol: emptyToNull(values.emergency_protocol),
    notes: emptyToNull(values.notes),
    management_plan: emptyToNull(values.management_plan),
    reaction: emptyToNull(values.reaction),
    aid: emptyToNull(values.aid),
    is_active: values.is_active,
  };
}

function formToUpdate(values: MedicalConditionFormValues): MediUpdate {
  return {
    condition_type_id: values.condition_type_id,
    custom_name: emptyToNull(values.custom_name),
    name: emptyToNull(values.name),
    severity: values.severity ?? null,
    medical_alert: values.medical_alert,
    alert_description: emptyToNull(values.alert_description),
    diagnosed_by: emptyToNull(values.diagnosed_by),
    diagnosed_date: emptyToNull(values.diagnosed_date),
    last_episode_date: emptyToNull(values.last_episode_date),
    treatment: emptyToNull(values.treatment),
    medication: emptyToNull(values.medication),
    triggers: emptyToNull(values.triggers),
    emergency_protocol: emptyToNull(values.emergency_protocol),
    notes: emptyToNull(values.notes),
    management_plan: emptyToNull(values.management_plan),
    reaction: emptyToNull(values.reaction),
    aid: emptyToNull(values.aid),
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
      const row = formToInsert(input.profileId, input.organisationId, values);
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
      await deleteActionPlansForCondition({
        secure,
        supabase: supabaseLike,
        typedClient: client,
        conditionId,
      });
      const del = await client.from('medi_condition').delete().eq('id', conditionId);
      if (del.error) throw new Error(del.error.message ?? 'Could not delete condition.');
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
    isReady: Boolean(client && input.profileId && input.organisationId),
  };
}
