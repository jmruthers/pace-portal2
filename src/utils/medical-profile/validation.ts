import { z } from '@solvera/pace-core/utils';
import type { Database } from '@/types/pace-database';
import type { CakeDietTypeRow } from '@/hooks/medical-profile/cakeDietTypes';
import { findDietTypeById } from '@/hooks/medical-profile/cakeDietTypes';

/**
 * PR09 medical summary form — minimal subset aligned with `medi_profile` and `app_medi_profile_update`.
 * Dietary: `menu_selection` holds `cake_diettype.diettype_id` (persisted as `medi_profile.diet_type_id`).
 */
const baseMedicalProfileFields = {
  medicare_number: z.string(),
  medicare_expiry: z.string(),
  health_care_card_number: z.string(),
  health_care_card_expiry: z.string(),
  health_fund_name: z.string(),
  health_fund_number: z.string(),
  dietary_comments: z.string(),
  menu_selection: z.string(),
  is_fully_immunised: z.boolean(),
  last_tetanus_date: z.string(),
  requires_support: z.boolean(),
  support_details: z.string(),
};

export function createMedicalProfileSchema(dietTypes: readonly CakeDietTypeRow[] | undefined) {
  return z
    .object(baseMedicalProfileFields)
    .superRefine((data, ctx) => {
      if (data.menu_selection.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a menu.',
          path: ['menu_selection'],
        });
      }
      const selected = findDietTypeById(dietTypes, data.menu_selection);
      const isOther = selected?.diettype_code === 'OT';
      if (isOther && data.dietary_comments.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Describe the dietary requirements for “Other”.',
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
    });
}

/** Default schema when diet options are not loaded; OT rule tightens once options exist. */
export const medicalProfileSchema = createMedicalProfileSchema(undefined);

export type MedicalProfileFormValues = z.infer<typeof medicalProfileSchema>;

export function defaultMedicalProfileFormValues(): MedicalProfileFormValues {
  return {
    medicare_number: '',
    medicare_expiry: '',
    health_care_card_number: '',
    health_care_card_expiry: '',
    health_fund_name: '',
    health_fund_number: '',
    dietary_comments: '',
    menu_selection: '',
    is_fully_immunised: false,
    last_tetanus_date: '',
    requires_support: false,
    support_details: '',
  };
}

type MediRow = Database['public']['Tables']['medi_profile']['Row'];

/**
 * Maps legacy free-text values to a `diettype_id` when options are available (migration helper).
 */
export function resolveMenuSelectionToDietId(
  stored: string | null | undefined,
  dietTypes: readonly CakeDietTypeRow[] | undefined
): string {
  const raw = stored?.trim() ?? '';
  if (!raw) return '';
  if (!dietTypes?.length) return '';
  if (dietTypes.some((d) => d.diettype_id === raw)) return raw;
  const byName = dietTypes.find(
    (d) => d.diettype_name.trim().toLowerCase() === raw.toLowerCase()
  );
  return byName?.diettype_id ?? '';
}

/** Maps persisted `medi_profile` row to form defaults (empty strings for nulls). */
export function mapMediProfileRowToFormValues(
  row: MediRow | null,
  dietTypes?: readonly CakeDietTypeRow[]
): MedicalProfileFormValues {
  if (!row) {
    return defaultMedicalProfileFormValues();
  }
  const fromRow = row.diet_type_id?.trim() ?? '';
  const menu_selection =
    dietTypes?.length && fromRow && !dietTypes.some((d) => d.diettype_id === fromRow)
      ? resolveMenuSelectionToDietId(fromRow, dietTypes) || ''
      : fromRow;
  return {
    medicare_number: row.medicare_number ?? '',
    medicare_expiry: row.medicare_expiry ?? '',
    health_care_card_number: row.health_care_card_number ?? '',
    health_care_card_expiry: row.health_care_card_expiry ?? '',
    health_fund_name: row.health_fund_name ?? '',
    health_fund_number: row.health_fund_number ?? '',
    dietary_comments: row.dietary_comments ?? '',
    menu_selection,
    is_fully_immunised: Boolean(row.is_fully_immunised),
    last_tetanus_date: row.last_tetanus_date ?? '',
    requires_support: Boolean(row.requires_support),
    support_details: row.support_details ?? '',
  };
}
