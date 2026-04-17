import { z } from '@solvera/pace-core/utils';
import type { Database } from '@/types/pace-database';

/**
 * PR09 medical summary form — minimal subset aligned with `medi_profile` and `app_medi_profile_update`.
 */
export const medicalProfileSchema = z
  .object({
    medicare_number: z.string(),
    medicare_expiry: z.string(),
    health_care_card_number: z.string(),
    health_care_card_expiry: z.string(),
    health_fund_name: z.string(),
    health_fund_number: z.string(),
    has_dietary_requirements: z.boolean(),
    dietary_comments: z.string(),
    menu_selection: z.string(),
    is_fully_immunised: z.boolean(),
    last_tetanus_date: z.string(),
    requires_support: z.boolean(),
    support_details: z.string(),
    has_carer: z.boolean(),
    carer_name: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.has_dietary_requirements && data.dietary_comments.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Describe dietary requirements, or turn off the dietary requirements option.',
        path: ['dietary_comments'],
      });
    }
    if (data.requires_support && data.support_details.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Describe the support required, or turn off the support option.',
        path: ['support_details'],
      });
    }
    if (data.has_carer && data.carer_name.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter the carer name, or turn off the carer option.',
        path: ['carer_name'],
      });
    }
  });

export type MedicalProfileFormValues = z.infer<typeof medicalProfileSchema>;

export function defaultMedicalProfileFormValues(): MedicalProfileFormValues {
  return {
    medicare_number: '',
    medicare_expiry: '',
    health_care_card_number: '',
    health_care_card_expiry: '',
    health_fund_name: '',
    health_fund_number: '',
    has_dietary_requirements: false,
    dietary_comments: '',
    menu_selection: '',
    is_fully_immunised: false,
    last_tetanus_date: '',
    requires_support: false,
    support_details: '',
    has_carer: false,
    carer_name: '',
  };
}

type MediRow = Database['public']['Tables']['medi_profile']['Row'];

/** Maps persisted `medi_profile` row to form defaults (empty strings for nulls). */
export function mapMediProfileRowToFormValues(row: MediRow | null): MedicalProfileFormValues {
  if (!row) {
    return defaultMedicalProfileFormValues();
  }
  return {
    medicare_number: row.medicare_number ?? '',
    medicare_expiry: row.medicare_expiry ?? '',
    health_care_card_number: row.health_care_card_number ?? '',
    health_care_card_expiry: row.health_care_card_expiry ?? '',
    health_fund_name: row.health_fund_name ?? '',
    health_fund_number: row.health_fund_number ?? '',
    has_dietary_requirements: Boolean(row.has_dietary_requirements),
    dietary_comments: row.dietary_comments ?? '',
    menu_selection: row.menu_selection ?? '',
    is_fully_immunised: Boolean(row.is_fully_immunised),
    last_tetanus_date: row.last_tetanus_date ?? '',
    requires_support: Boolean(row.requires_support),
    support_details: row.support_details ?? '',
    has_carer: Boolean(row.has_carer),
    carer_name: row.carer_name ?? '',
  };
}
