/**
 * PR21 participant itinerary reads — TRAC SLICE-05 Option A, read-only, participant-scoped.
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParticipantItineraryRawData } from '@/lib/participantItineraryContracts';
import type { ParticipantItineraryDatabase } from '@/lib/participantItineraryDatabase';
import type {
  TracAccommodationRow,
  TracActivityRow,
  TracItineraryAssignmentRow,
  TracResourceType,
  TracTransportRow,
} from '@/lib/participantItineraryRows';

/** TRAC logistics status values eligible for participant itinerary (SLICE-05 Q-01). */
export const PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES = ['booked', 'confirmed'] as const;

const TRANSPORT_SELECT =
  'id, event_id, departure_time, arrival_time, departure_timezone, arrival_timezone, status, transport_number, departure_display_name, arrival_display_name, departure_short_address, arrival_short_address, mode, notes';

const ACTIVITY_SELECT =
  'id, event_id, start_time, finish_time, start_location_timezone, finish_location_timezone, status, name, start_location_display_name, finish_location_display_name';

const ACCOMMODATION_SELECT =
  'id, event_id, check_in_time, check_out_time, location_timezone, status, name, location_display_name, location_short_address';

function isTracResourceType(value: string): value is TracResourceType {
  return value === 'transport' || value === 'activity' || value === 'accommodation';
}

function idsForType(
  assignments: TracItineraryAssignmentRow[],
  resourceType: TracResourceType
): string[] {
  const ids = new Set<string>();
  for (const row of assignments) {
    if (row.resource_type === resourceType) {
      ids.add(row.resource_id);
    }
  }
  return [...ids];
}

async function fetchTransportRows(
  client: SupabaseClient<ParticipantItineraryDatabase>,
  eventId: string,
  ids: string[]
): Promise<ApiResult<TracTransportRow[]>> {
  if (ids.length === 0) return ok([]);

  const { data, error } = await client
    .from('trac_transport')
    .select(TRANSPORT_SELECT)
    .eq('event_id', eventId)
    .in('id', ids)
    .in('status', [...PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES]);

  if (error) {
    return err({
      code: 'ITINERARY_TRANSPORT_QUERY',
      message: error.message?.trim() || 'Could not load transport itinerary items.',
    });
  }

  return ok((data ?? []) as TracTransportRow[]);
}

async function fetchActivityRows(
  client: SupabaseClient<ParticipantItineraryDatabase>,
  eventId: string,
  ids: string[]
): Promise<ApiResult<TracActivityRow[]>> {
  if (ids.length === 0) return ok([]);

  const { data, error } = await client
    .from('trac_activity')
    .select(ACTIVITY_SELECT)
    .eq('event_id', eventId)
    .in('id', ids)
    .in('status', [...PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES]);

  if (error) {
    return err({
      code: 'ITINERARY_ACTIVITY_QUERY',
      message: error.message?.trim() || 'Could not load activity itinerary items.',
    });
  }

  return ok((data ?? []) as TracActivityRow[]);
}

async function fetchAccommodationRows(
  client: SupabaseClient<ParticipantItineraryDatabase>,
  eventId: string,
  ids: string[]
): Promise<ApiResult<TracAccommodationRow[]>> {
  if (ids.length === 0) return ok([]);

  const { data, error } = await client
    .from('trac_accommodation')
    .select(ACCOMMODATION_SELECT)
    .eq('event_id', eventId)
    .in('id', ids)
    .in('status', [...PARTICIPANT_ITINERARY_ELIGIBLE_STATUSES]);

  if (error) {
    return err({
      code: 'ITINERARY_ACCOMMODATION_QUERY',
      message: error.message?.trim() || 'Could not load accommodation itinerary items.',
    });
  }

  return ok((data ?? []) as TracAccommodationRow[]);
}

export async function fetchParticipantItinerary(
  client: SupabaseClient<ParticipantItineraryDatabase>,
  applicationId: string,
  eventId: string
): Promise<ApiResult<ParticipantItineraryRawData>> {
  const trimmedAppId = applicationId.trim();
  const trimmedEventId = eventId.trim();
  if (!trimmedAppId || !trimmedEventId) {
    return err({
      code: 'ITINERARY_CONTEXT',
      message: 'Application and event are required to load itinerary.',
    });
  }

  const assignRes = await client
    .from('trac_itinerary_assignment')
    .select('id, application_id, event_id, organisation_id, resource_id, resource_type')
    .eq('application_id', trimmedAppId)
    .eq('event_id', trimmedEventId);

  if (assignRes.error) {
    return err({
      code: 'ITINERARY_ASSIGNMENT_QUERY',
      message: assignRes.error.message?.trim() || 'Could not load itinerary assignments.',
    });
  }

  const assignments = (assignRes.data ?? []).filter((row): row is TracItineraryAssignmentRow =>
    isTracResourceType(String(row.resource_type))
  );

  const transportIds = idsForType(assignments, 'transport');
  const activityIds = idsForType(assignments, 'activity');
  const accommodationIds = idsForType(assignments, 'accommodation');

  const [transportRes, activityRes, accommodationRes] = await Promise.all([
    fetchTransportRows(client, trimmedEventId, transportIds),
    fetchActivityRows(client, trimmedEventId, activityIds),
    fetchAccommodationRows(client, trimmedEventId, accommodationIds),
  ]);

  if (!transportRes.ok) return transportRes;
  if (!activityRes.ok) return activityRes;
  if (!accommodationRes.ok) return accommodationRes;

  return ok({
    applicationId: trimmedAppId,
    assignments,
    transport: transportRes.data,
    activities: activityRes.data,
    accommodations: accommodationRes.data,
  });
}
