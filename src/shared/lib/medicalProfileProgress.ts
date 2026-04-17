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
  values: MedicalProfileFormValues
): MedicalProfileProgressResult {
  const slots: boolean[] = [
    nonEmpty(values.medicare_number),
    nonEmpty(values.medicare_expiry),
    nonEmpty(values.health_fund_name) || nonEmpty(values.health_fund_number),
    nonEmpty(values.health_care_card_number) || nonEmpty(values.health_care_card_expiry),
    values.has_dietary_requirements ? nonEmpty(values.dietary_comments) : true,
    nonEmpty(values.menu_selection),
    values.is_fully_immunised || nonEmpty(values.last_tetanus_date),
    values.requires_support ? nonEmpty(values.support_details) : true,
    values.has_carer ? nonEmpty(values.carer_name) : true,
  ];

  const totalFields = slots.length;
  const filledFields = slots.filter(Boolean).length;
  const completionRatio = totalFields === 0 ? 0 : filledFields / totalFields;

  return { completionRatio, totalFields, filledFields };
}
