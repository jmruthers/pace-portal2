import {
  deriveItineraryDayEntries,
  groupItineraryEntriesByDay,
  type ItineraryAssignmentInput,
  type ItineraryResourceInput,
} from '@solvera/pace-core/itinerary';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';
import type {
  ParticipantItineraryDerived,
  ParticipantItineraryDisplayItem,
  ParticipantItineraryRawData,
  TracAccommodationRow,
  TracActivityRow,
  TracTransportRow,
} from '@/lib/participantItineraryContracts';
import { entryKindLabel, resourceTypeLabel } from '@/lib/participantItineraryLabels';

function transportTitle(row: TracTransportRow): string {
  const number = row.transport_number?.trim();
  if (number) return number;
  const from = row.departure_display_name?.trim() || row.departure_short_address?.trim();
  const to = row.arrival_display_name?.trim() || row.arrival_short_address?.trim();
  if (from && to) return `${from} → ${to}`;
  if (from) return from;
  if (to) return to;
  return 'Transport';
}

function activityTitle(row: TracActivityRow): string {
  const name = row.name?.trim();
  return name !== '' && name != null ? name : 'Activity';
}

function accommodationTitle(row: TracAccommodationRow): string {
  const name = row.name?.trim();
  return name !== '' && name != null ? name : 'Accommodation';
}

function formatWhen(timestamp: string | null): string | null {
  if (timestamp == null || timestamp.trim() === '') return null;
  return formatEventDateForDisplay(timestamp);
}

function buildDisplayLookup(raw: ParticipantItineraryRawData): Map<string, { title: string; detail: string | null }> {
  const lookup = new Map<string, { title: string; detail: string | null }>();

  for (const row of raw.transport) {
    const detail =
      row.departure_display_name?.trim() && row.arrival_display_name?.trim()
        ? `${row.departure_display_name.trim()} to ${row.arrival_display_name.trim()}`
        : row.notes?.trim() || null;
    lookup.set(`transport:${row.id}`, { title: transportTitle(row), detail });
  }

  for (const row of raw.activities) {
    const start = row.start_location_display_name?.trim();
    const finish = row.finish_location_display_name?.trim();
    let detail: string | null = null;
    if (start && finish) detail = `${start} → ${finish}`;
    else if (start) detail = start;
    else if (finish) detail = finish;
    lookup.set(`activity:${row.id}`, { title: activityTitle(row), detail });
  }

  for (const row of raw.accommodations) {
    const detail =
      row.location_display_name?.trim() ||
      row.location_short_address?.trim() ||
      null;
    lookup.set(`accommodation:${row.id}`, { title: accommodationTitle(row), detail });
  }

  return lookup;
}

function orderingTimestampForEntry(
  entry: { resourceType: string; resourceId: string; entryKind: string },
  raw: ParticipantItineraryRawData
): string | null {
  if (entry.resourceType === 'transport') {
    const row = raw.transport.find((r) => r.id === entry.resourceId);
    if (!row) return null;
    if (entry.entryKind === 'arrival') return row.arrival_time;
    return row.departure_time;
  }
  if (entry.resourceType === 'activity') {
    const row = raw.activities.find((r) => r.id === entry.resourceId);
    if (!row) return null;
    if (entry.entryKind === 'finish') return row.finish_time;
    return row.start_time;
  }
  if (entry.resourceType === 'accommodation') {
    const row = raw.accommodations.find((r) => r.id === entry.resourceId);
    if (!row) return null;
    if (entry.entryKind === 'check-out') return row.check_out_time;
    if (entry.entryKind === 'check-in') return row.check_in_time;
    return null;
  }
  return null;
}

export function mapRawDataToItineraryResources(
  raw: ParticipantItineraryRawData
): {
  resources: ItineraryResourceInput[];
  assignments: ItineraryAssignmentInput[];
} {
  const resources: ItineraryResourceInput[] = [];

  for (const row of raw.transport) {
    resources.push({
      resourceType: 'transport',
      resourceId: row.id,
      departureTime: row.departure_time,
      arrivalTime: row.arrival_time,
      departureTimezone: row.departure_timezone,
      arrivalTimezone: row.arrival_timezone,
    });
  }

  for (const row of raw.activities) {
    resources.push({
      resourceType: 'activity',
      resourceId: row.id,
      startTime: row.start_time,
      finishTime: row.finish_time,
      startTimezone: row.start_location_timezone,
      finishTimezone: row.finish_location_timezone,
    });
  }

  for (const row of raw.accommodations) {
    resources.push({
      resourceType: 'accommodation',
      resourceId: row.id,
      checkInTime: row.check_in_time,
      checkOutTime: row.check_out_time,
      timezone: row.location_timezone,
    });
  }

  const assignments: ItineraryAssignmentInput[] = raw.assignments.map((a) => ({
    resourceType: a.resource_type,
    resourceId: a.resource_id,
    participantApplicationId: a.application_id,
  }));

  return { resources, assignments };
}

/** Derives day groups via CR26 and joins display metadata for the portal list UI. */
export function deriveParticipantItinerary(raw: ParticipantItineraryRawData): ParticipantItineraryDerived {
  const { resources, assignments } = mapRawDataToItineraryResources(raw);
  const entries = deriveItineraryDayEntries({
    resources,
    assignments,
    scope: { mode: 'participant', participantApplicationId: raw.applicationId },
    eventDefaultTimezone: null,
  });
  const dayGroups = groupItineraryEntriesByDay(entries);
  const displayLookup = buildDisplayLookup(raw);

  const days = dayGroups.map((group) => ({
    dayKey: group.dayKey,
    items: group.entries.map((entry): ParticipantItineraryDisplayItem => {
      const meta = displayLookup.get(`${entry.resourceType}:${entry.resourceId}`);
      const when = formatWhen(orderingTimestampForEntry(entry, raw));
      const kind = entryKindLabel(entry.entryKind);
      const type = resourceTypeLabel(entry.resourceType);
      return {
        entry,
        title: meta?.title ?? type,
        detail: meta?.detail ?? null,
        whenLabel: when != null ? `${kind} · ${when}` : kind,
      };
    }),
  }));

  return { dayGroups, days };
}
