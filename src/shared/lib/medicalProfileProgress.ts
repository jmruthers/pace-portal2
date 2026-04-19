import { findDietTypeById, type CakeDietTypeRow } from '@/hooks/medical-profile/cakeDietTypes';
import type { MedicalProfileFormValues } from '@/utils/medical-profile/validation';

export type MedicalProfileProgressResult = {
  completionRatio: number;
  totalFields: number;
  filledFields: number;
};

function nonEmpty(s: string | null | undefined): boolean {
  return s != null && String(s).trim() !== '';
}

/**
 * Progress for the PR09 medical summary: counts a fixed set of “key fields” from the minimal form.
 */
export function computeMedicalProfileProgress(
  values: MedicalProfileFormValues,
  dietTypes?: readonly CakeDietTypeRow[]
): MedicalProfileProgressResult {
  const selected = findDietTypeById(dietTypes, values.menu_selection);
  const isOther = selected?.diettype_code === 'OT';
  const dietSlot =
    nonEmpty(values.menu_selection) && (!isOther || nonEmpty(values.dietary_comments));

  const slots: boolean[] = [
    nonEmpty(values.medicare_number),
    nonEmpty(values.medicare_expiry),
    nonEmpty(values.health_fund_name) || nonEmpty(values.health_fund_number),
    nonEmpty(values.health_care_card_number) || nonEmpty(values.health_care_card_expiry),
    dietSlot,
    values.is_fully_immunised || nonEmpty(values.last_tetanus_date),
  ];

  const totalFields = slots.length;
  const filledFields = slots.filter(Boolean).length;
  const completionRatio = totalFields === 0 ? 0 : filledFields / totalFields;

  return { completionRatio, totalFields, filledFields };
}
