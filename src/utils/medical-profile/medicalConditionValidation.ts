import { z } from '@solvera/pace-core/utils';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';

export const medicalConditionFormSchema = z
  .object({
    condition_type_id: z.number().int().positive('Select a condition type.'),
    name: z.string(),
    severity: z.enum(['Mild', 'Moderate', 'Severe']).nullable().optional(),
    medical_alert: z.boolean(),
    diagnosed_by: z.string(),
    diagnosed_date: z.string(),
    treatment: z.string(),
    medications_and_aids: z.string(),
    triggers: z.string(),
    emergency_protocol: z.string(),
    notes: z.string(),
    action_plan_date: z.string(),
    is_active: z.boolean(),
  });

export type MedicalConditionFormValues = z.infer<typeof medicalConditionFormSchema>;

export function defaultMedicalConditionFormValues(): MedicalConditionFormValues {
  return {
    condition_type_id: 0,
    name: '',
    severity: null,
    medical_alert: false,
    diagnosed_by: '',
    diagnosed_date: '',
    treatment: '',
    medications_and_aids: '',
    triggers: '',
    emergency_protocol: '',
    notes: '',
    action_plan_date: '',
    is_active: true,
  };
}

export function mapMediConditionToFormValues(row: MediConditionDetail): MedicalConditionFormValues {
  return {
    condition_type_id: row.condition_type_id,
    name: row.name ?? '',
    severity: row.severity ?? null,
    medical_alert: Boolean(row.medical_alert),
    diagnosed_by: row.diagnosed_by ?? '',
    diagnosed_date: row.diagnosed_date ?? '',
    treatment: row.treatment ?? '',
    medications_and_aids: row.medications_and_aids ?? '',
    triggers: row.triggers ?? '',
    emergency_protocol: row.emergency_protocol ?? '',
    notes: row.notes ?? '',
    action_plan_date: row.action_plan_date ?? '',
    is_active: row.is_active !== false,
  };
}
