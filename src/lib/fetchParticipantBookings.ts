/**
 * BA10 participant booking list projection (PR19).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import {
  computeCancellable,
} from '@/lib/activityBookingRules';
import type { ActivityBookingStatus, ParticipantBookingItem } from '@/lib/activityBookingTypes';

type BookingRow = Pick<
  Database['public']['Tables']['base_activity_booking']['Row'],
  'id' | 'session_id' | 'status' | 'booked_at' | 'cancelled_at'
>;

type SessionJoin = {
  session_name: string | null;
  start_time: string;
  end_time: string;
  base_activity_offering: { name: string } | { name: string }[] | null;
};

type BookingWithSession = BookingRow & {
  base_activity_session: SessionJoin | SessionJoin[] | null;
};

function normalizeOfferingName(
  offering: SessionJoin['base_activity_offering']
): string {
  if (offering == null) return 'Activity';
  if (Array.isArray(offering)) {
    const first = offering[0];
    return typeof first?.name === 'string' && first.name.trim() !== '' ? first.name.trim() : 'Activity';
  }
  return typeof offering.name === 'string' && offering.name.trim() !== '' ? offering.name.trim() : 'Activity';
}

function normalizeSessionJoin(
  raw: BookingWithSession['base_activity_session']
): SessionJoin | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function isActivityBookingStatus(v: string): v is ActivityBookingStatus {
  return v === 'confirmed' || v === 'waitlisted' || v === 'cancelled';
}

export async function fetchParticipantBookings(
  client: SupabaseClient<Database>,
  applicationId: string,
  now: Date = new Date()
): Promise<ApiResult<ParticipantBookingItem[]>> {
  const trimmed = applicationId.trim();
  if (!trimmed) {
    return err({ code: 'ACTIVITY_BOOKINGS_SHAPE', message: 'Application id is required.' });
  }

  const { data, error } = await client
    .from('base_activity_booking')
    .select(
      `
      id,
      session_id,
      status,
      booked_at,
      cancelled_at,
      base_activity_session (
        session_name,
        start_time,
        end_time,
        base_activity_offering ( name )
      )
    `
    )
    .eq('application_id', trimmed)
    .order('booked_at', { ascending: false });

  if (error) {
    return err({
      code: 'ACTIVITY_BOOKINGS_QUERY',
      message: error.message?.trim() || 'Could not load your bookings.',
    });
  }

  const items: ParticipantBookingItem[] = [];
  for (const row of (data ?? []) as BookingWithSession[]) {
    const statusRaw = row.status;
    if (!isActivityBookingStatus(statusRaw)) continue;
    const session = normalizeSessionJoin(row.base_activity_session);
    if (session == null) continue;
    const onWaitlist = statusRaw === 'waitlisted';
    items.push({
      id: row.id,
      session_id: row.session_id,
      session_name: session.session_name,
      start_time: session.start_time,
      end_time: session.end_time,
      offering_name: normalizeOfferingName(session.base_activity_offering),
      status: statusRaw,
      booked_at: row.booked_at,
      cancelled_at: row.cancelled_at,
      cancellable: computeCancellable(statusRaw, session.start_time, now),
      onWaitlist,
    });
  }

  return ok(items);
}

export async function fetchParticipantApplication(
  client: SupabaseClient<Database>,
  personId: string,
  eventId: string
): Promise<
  ApiResult<{
    id: string;
    event_id: string;
    organisation_id: string;
    person_id: string;
    status: string;
  } | null>
> {
  const { data, error } = await client
    .from('base_application')
    .select('id, event_id, organisation_id, person_id, status')
    .eq('person_id', personId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    return err({
      code: 'ACTIVITY_APPLICATION_QUERY',
      message: error.message?.trim() || 'Could not load application.',
    });
  }

  if (!data) {
    return ok(null);
  }

  return ok({
    id: data.id,
    event_id: data.event_id,
    organisation_id: data.organisation_id,
    person_id: data.person_id,
    status: data.status,
  });
}
