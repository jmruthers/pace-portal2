/**
 * BA10 browse projection — offerings and sessions for an event (PR19).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import {
  computeBookingWindowOpen,
  computeCapacityFull,
  computeWaitlistOpen,
} from '@/lib/activityBookingRules';
import type { OfferingBrowseItem, SessionBrowseItem } from '@/lib/activityBookingTypes';

type OfferingRow = Pick<
  Database['public']['Tables']['base_activity_offering']['Row'],
  | 'id'
  | 'name'
  | 'description'
  | 'booking_open_at'
  | 'booking_close_at'
  | 'allow_waitlist'
  | 'is_active'
>;

type SessionRow = Pick<
  Database['public']['Tables']['base_activity_session']['Row'],
  | 'id'
  | 'offering_id'
  | 'session_name'
  | 'start_time'
  | 'end_time'
  | 'capacity'
  | 'location_display_name'
>;

export async function fetchActivityBookingBrowse(
  client: SupabaseClient<Database>,
  eventId: string,
  now: Date = new Date()
): Promise<ApiResult<OfferingBrowseItem[]>> {
  const trimmed = eventId.trim();
  if (!trimmed) {
    return err({ code: 'ACTIVITY_BROWSE_SHAPE', message: 'Event id is required.' });
  }

  const offeringsRes = await client
    .from('base_activity_offering')
    .select(
      'id, name, description, booking_open_at, booking_close_at, allow_waitlist, is_active'
    )
    .eq('event_id', trimmed)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (offeringsRes.error) {
    return err({
      code: 'ACTIVITY_BROWSE_QUERY',
      message: offeringsRes.error.message?.trim() || 'Could not load activities.',
    });
  }

  const sessionsRes = await client
    .from('base_activity_session')
    .select('id, offering_id, session_name, start_time, end_time, capacity, location_display_name')
    .eq('event_id', trimmed)
    .order('start_time', { ascending: true });

  if (sessionsRes.error) {
    return err({
      code: 'ACTIVITY_BROWSE_QUERY',
      message: sessionsRes.error.message?.trim() || 'Could not load activity sessions.',
    });
  }

  const countsRes = await client
    .from('base_activity_booking')
    .select('session_id, status')
    .eq('event_id', trimmed)
    .eq('status', 'confirmed');

  if (countsRes.error) {
    return err({
      code: 'ACTIVITY_BROWSE_QUERY',
      message: countsRes.error.message?.trim() || 'Could not load session capacity.',
    });
  }

  const confirmedBySession = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    const sid = row.session_id;
    if (typeof sid !== 'string') continue;
    confirmedBySession.set(sid, (confirmedBySession.get(sid) ?? 0) + 1);
  }

  const offerings = (offeringsRes.data ?? []) as OfferingRow[];
  const sessions = (sessionsRes.data ?? []) as SessionRow[];

  const sessionsByOffering = new Map<string, SessionBrowseItem[]>();
  for (const s of sessions) {
    const offering = offerings.find((o) => o.id === s.offering_id);
    const allowWaitlist = offering?.allow_waitlist ?? false;
    const confirmedCount = confirmedBySession.get(s.id) ?? 0;
    const capacityFull = computeCapacityFull(confirmedCount, s.capacity);
    const item: SessionBrowseItem = {
      id: s.id,
      session_name: s.session_name,
      start_time: s.start_time,
      end_time: s.end_time,
      location_display: s.location_display_name,
      capacity: s.capacity,
      allow_waitlist: allowWaitlist,
      capacityFull,
      waitlistOpen: computeWaitlistOpen(capacityFull, allowWaitlist),
      confirmedCount,
    };
    const list = sessionsByOffering.get(s.offering_id) ?? [];
    list.push(item);
    sessionsByOffering.set(s.offering_id, list);
  }

  const browse: OfferingBrowseItem[] = offerings.map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
    location_display: null,
    booking_open_at: o.booking_open_at,
    booking_close_at: o.booking_close_at,
    bookingWindowOpen: computeBookingWindowOpen(o.booking_open_at, o.booking_close_at, now),
    consentRequired: false,
    consentText: null,
    sessions: sessionsByOffering.get(o.id) ?? [],
  }));

  return ok(browse);
}
