/**
 * BA10 — Persist activity_waiver consent after booking create (PR19).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { ACTIVITY_WAIVER_CONSENT_TYPE } from '@/lib/activityBookingConsent';

export type PersistActivityBookingConsentInput = {
  bookingId: string;
  applicationId: string;
  eventId: string;
  organisationId: string;
  consentedByPersonId: string;
  consentedForPersonId: string;
  verbatimText: string;
  createdByUserId?: string | null;
};

export async function persistActivityBookingConsent(
  client: SupabaseClient<Database>,
  input: PersistActivityBookingConsentInput
): Promise<ApiResult<void>> {
  const applicationId = input.applicationId.trim();
  const verbatim = input.verbatimText.trim();
  if (!applicationId) {
    return err({
      code: 'ACTIVITY_CONSENT_SHAPE',
      message: 'Application id is required.',
    });
  }
  if (!verbatim) {
    return err({
      code: 'ACTIVITY_CONSENT_SHAPE',
      message: 'Consent text is required.',
    });
  }

  const { error } = await client.from('base_consent').insert({
    application_id: applicationId,
    booking_id: input.bookingId.trim(),
    event_id: input.eventId.trim(),
    organisation_id: input.organisationId.trim(),
    consent_type: ACTIVITY_WAIVER_CONSENT_TYPE,
    verbatim_text: verbatim,
    consented_by: input.consentedByPersonId.trim(),
    consented_for: input.consentedForPersonId.trim(),
    created_by: input.createdByUserId ?? null,
  });

  if (error) {
    return err({
      code: 'ACTIVITY_CONSENT_INSERT',
      message: error.message?.trim() || 'Could not save activity consent.',
    });
  }

  return ok(undefined);
}
