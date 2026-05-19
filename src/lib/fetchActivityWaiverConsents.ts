/**
 * BA10 — Offering ids that already have activity_waiver consent for an application (PR19).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { ACTIVITY_WAIVER_CONSENT_TYPE } from '@/lib/activityBookingConsent';

type ConsentBookingRow = {
  booking_id: string | null;
  base_activity_booking: {
    session_id: string;
    base_activity_session: { offering_id: string } | { offering_id: string }[] | null;
  } | {
    session_id: string;
    base_activity_session: { offering_id: string } | { offering_id: string }[] | null;
  }[] | null;
};

function normalizeSessionOffering(
  raw: ConsentBookingRow['base_activity_booking']
): string | null {
  if (raw == null) return null;
  const booking = Array.isArray(raw) ? raw[0] : raw;
  if (!booking) return null;
  const session = booking.base_activity_session;
  const sessionRow = Array.isArray(session) ? session[0] : session;
  const offeringId = sessionRow?.offering_id;
  return typeof offeringId === 'string' && offeringId.trim() !== '' ? offeringId : null;
}

export async function fetchActivityWaiverConsentedOfferingIds(
  client: SupabaseClient<Database>,
  args: {
    applicationId: string;
    personId: string;
    eventId: string;
  }
): Promise<ApiResult<ReadonlySet<string>>> {
  const applicationId = args.applicationId.trim();
  const personId = args.personId.trim();
  const eventId = args.eventId.trim();

  if (!applicationId || !personId || !eventId) {
    return err({
      code: 'ACTIVITY_CONSENT_SHAPE',
      message: 'Application, person, and event are required for consent lookup.',
    });
  }

  const { data, error } = await client
    .from('base_consent')
    .select(
      `
      booking_id,
      base_activity_booking!inner (
        session_id,
        base_activity_session!inner ( offering_id )
      )
    `
    )
    .eq('application_id', applicationId)
    .eq('event_id', eventId)
    .eq('consent_type', ACTIVITY_WAIVER_CONSENT_TYPE)
    .eq('consented_for', personId)
    .not('booking_id', 'is', null);

  if (error) {
    return err({
      code: 'ACTIVITY_CONSENT_QUERY',
      message: error.message?.trim() || 'Could not load activity consent records.',
    });
  }

  const offeringIds = new Set<string>();
  for (const row of (data ?? []) as ConsentBookingRow[]) {
    const offeringId = normalizeSessionOffering(row.base_activity_booking);
    if (offeringId) {
      offeringIds.add(offeringId);
    }
  }

  return ok(offeringIds);
}
