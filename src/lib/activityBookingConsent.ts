/**
 * BA10 consent projection helpers for activity booking (PR19).
 */
import type { OfferingBrowseItem } from '@/lib/activityBookingTypes';

export const ACTIVITY_WAIVER_CONSENT_TYPE = 'activity_waiver' as const;

/** Verbatim waiver text shown when an offering requires consent. */
export function offeringConsentText(description: string | null | undefined): string | null {
  const text = description?.trim() ?? '';
  return text.length > 0 ? text : null;
}

export function computeOfferingConsentProjection(
  offering: Pick<OfferingBrowseItem, 'id' | 'description'>,
  consentedOfferingIds: ReadonlySet<string>
): Pick<OfferingBrowseItem, 'consentRequired' | 'consentText'> {
  const consentText = offeringConsentText(offering.description);
  const consentRequired =
    consentText != null && !consentedOfferingIds.has(offering.id);
  return { consentRequired, consentText };
}

export function applyOfferingConsentProjections(
  offerings: OfferingBrowseItem[],
  consentedOfferingIds: ReadonlySet<string>
): OfferingBrowseItem[] {
  return offerings.map((o) => ({
    ...o,
    ...computeOfferingConsentProjection(o, consentedOfferingIds),
  }));
}
