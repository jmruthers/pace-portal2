import { z } from '@solvera/pace-core/utils';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';

export const medicalConditionFormSchema = z
  .object({
    condition_type_id: z.number().int().positive('Select a condition type.'),
    custom_name: z.string(),
    name: z.string(),
    severity: z.enum(['Low', 'Medium', 'High']).nullable().optional(),
    medical_alert: z.boolean(),
    alert_description: z.string(),
    diagnosed_by: z.string(),
    diagnosed_date: z.string(),
    last_episode_date: z.string(),
    treatment: z.string(),
    medication: z.string(),
    triggers: z.string(),
    emergency_protocol: z.string(),
    notes: z.string(),
    management_plan: z.string(),
    reaction: z.string(),
    aid: z.string(),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.medical_alert && data.alert_description.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Describe the medical alert, or turn off the alert.',
        path: ['alert_description'],
      });
    }
  });

export type MedicalConditionFormValues = z.infer<typeof medicalConditionFormSchema>;

export function defaultMedicalConditionFormValues(): MedicalConditionFormValues {
  return {
    condition_type_id: 0,
    custom_name: '',
    name: '',
    severity: null,
    medical_alert: false,
    alert_description: '',
    diagnosed_by: '',
    diagnosed_date: '',
    last_episode_date: '',
    treatment: '',
    medication: '',
    triggers: '',
    emergency_protocol: '',
    notes: '',
    management_plan: '',
    reaction: '',
    aid: '',
    is_active: true,
  };
}

export function mapMediConditionToFormValues(row: MediConditionDetail): MedicalConditionFormValues {
  return {
    condition_type_id: row.condition_type_id,
    custom_name: row.custom_name ?? '',
    name: row.name ?? '',
    severity: row.severity ?? null,
    medical_alert: Boolean(row.medical_alert),
    alert_description: row.alert_description ?? '',
    diagnosed_by: row.diagnosed_by ?? '',
    diagnosed_date: row.diagnosed_date ?? '',
    last_episode_date: row.last_episode_date ?? '',
    treatment: row.treatment ?? '',
    medication: row.medication ?? '',
    triggers: row.triggers ?? '',
    emergency_protocol: row.emergency_protocol ?? '',
    notes: row.notes ?? '',
    management_plan: row.management_plan ?? '',
    reaction: row.reaction ?? '',
    aid: row.aid ?? '',
    is_active: row.is_active !== false,
  };
}
