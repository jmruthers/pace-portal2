import { useReferenceData, type ReferenceDataBundle } from '@/shared/hooks/useReferenceData';

/** Re-export for PR07 contract — lookup rows for member profile selects. */
export type MemberProfileReferenceData = ReferenceDataBundle;

/**
 * Reference data for member profile dropdowns (phone types, membership, gender, pronouns).
 * Thin wrapper over {@link useReferenceData} for slice ownership clarity.
 */
export function useMemberAdditionalFields() {
  return useReferenceData();
}
