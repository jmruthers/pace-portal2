import { describe, expect, it } from 'vitest';
import {
  deriveParticipantItinerary,
  mapRawDataToItineraryResources,
} from '@/lib/mapParticipantItineraryToCr26';
import type { ParticipantItineraryRawData } from '@/lib/participantItineraryContracts';

const applicationId = 'app-1';

function baseRaw(overrides: Partial<ParticipantItineraryRawData> = {}): ParticipantItineraryRawData {
  return {
    applicationId,
    assignments: [],
    transport: [],
    activities: [],
    accommodations: [],
    ...overrides,
  };
}

describe('mapParticipantItineraryToCr26', () => {
  it('maps transport rows to CR26 inputs with snake_case timestamps', () => {
    const raw = baseRaw({
      transport: [
        {
          id: 'tr-1',
          event_id: 'ev-1',
          departure_time: '2026-01-10T08:00:00Z',
          arrival_time: '2026-01-10T16:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'booked',
          transport_number: 'Bus 1',
          departure_display_name: null,
          arrival_display_name: null,
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
      ],
      assignments: [
        {
          id: 'a-1',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'tr-1',
          resource_type: 'transport',
        },
      ],
    });

    const { resources, assignments } = mapRawDataToItineraryResources(raw);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      resourceType: 'transport',
      resourceId: 'tr-1',
      departureTime: '2026-01-10T08:00:00Z',
      arrivalTime: '2026-01-10T16:00:00Z',
    });
    expect(assignments[0]?.participantApplicationId).toBe(applicationId);
  });

  it('derives multi-day transport and accommodation via CR26 with eventDefaultTimezone null', () => {
    const raw = baseRaw({
      assignments: [
        {
          id: 'a-tr',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'tr-multi',
          resource_type: 'transport',
        },
        {
          id: 'a-ho',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'ho-1',
          resource_type: 'accommodation',
        },
      ],
      transport: [
        {
          id: 'tr-multi',
          event_id: 'ev-1',
          departure_time: '2026-01-10T23:00:00Z',
          arrival_time: '2026-01-11T02:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'confirmed',
          transport_number: null,
          departure_display_name: 'A',
          arrival_display_name: 'B',
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
      ],
      accommodations: [
        {
          id: 'ho-1',
          event_id: 'ev-1',
          check_in_time: '2026-01-10T10:00:00Z',
          check_out_time: '2026-01-12T01:00:00Z',
          location_timezone: 'UTC',
          status: 'booked',
          name: 'Lodge',
          location_display_name: 'Site',
          location_short_address: null,
        },
      ],
    });

    const derived = deriveParticipantItinerary(raw);
    expect(derived.days.map((d) => d.dayKey)).toEqual(['2026-01-10', '2026-01-11', '2026-01-12']);
    expect(
      derived.dayGroups.flatMap((g) =>
        g.entries.map((e) => `${e.resourceId}:${e.entryKind}:${e.dayKey}`)
      )
    ).toEqual(
      expect.arrayContaining([
        'tr-multi:departure:2026-01-10',
        'tr-multi:arrival:2026-01-11',
        'ho-1:check-in:2026-01-10',
        'ho-1:occupied:2026-01-11',
        'ho-1:check-out:2026-01-12',
      ])
    );
  });

  it('participant scope excludes unassigned resources from derived days', () => {
    const raw = baseRaw({
      transport: [
        {
          id: 'tr-assigned',
          event_id: 'ev-1',
          departure_time: '2026-01-10T08:00:00Z',
          arrival_time: '2026-01-10T09:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'booked',
          transport_number: null,
          departure_display_name: null,
          arrival_display_name: null,
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
        {
          id: 'tr-other',
          event_id: 'ev-1',
          departure_time: '2026-01-11T08:00:00Z',
          arrival_time: '2026-01-11T09:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'booked',
          transport_number: null,
          departure_display_name: null,
          arrival_display_name: null,
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
      ],
      assignments: [
        {
          id: 'a-1',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'tr-assigned',
          resource_type: 'transport',
        },
      ],
    });

    const derived = deriveParticipantItinerary(raw);
    const resourceIds = new Set(
      derived.dayGroups.flatMap((g) => g.entries.map((e) => e.resourceId))
    );
    expect(resourceIds).toEqual(new Set(['tr-assigned']));
  });

  it('orders mixed resource types within a day per CR26 comparator rules', () => {
    const raw = baseRaw({
      assignments: [
        {
          id: 'a-ac',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'ac-1',
          resource_type: 'activity',
        },
        {
          id: 'a-tr',
          application_id: applicationId,
          event_id: 'ev-1',
          organisation_id: 'org-1',
          resource_id: 'tr-1',
          resource_type: 'transport',
        },
      ],
      transport: [
        {
          id: 'tr-1',
          event_id: 'ev-1',
          departure_time: '2026-01-10T14:00:00Z',
          arrival_time: '2026-01-10T18:00:00Z',
          departure_timezone: 'UTC',
          arrival_timezone: 'UTC',
          status: 'booked',
          transport_number: null,
          departure_display_name: null,
          arrival_display_name: null,
          departure_short_address: null,
          arrival_short_address: null,
          mode: 'bus',
          notes: null,
        },
      ],
      activities: [
        {
          id: 'ac-1',
          event_id: 'ev-1',
          start_time: '2026-01-10T09:00:00Z',
          finish_time: '2026-01-10T10:00:00Z',
          start_location_timezone: 'UTC',
          finish_location_timezone: 'UTC',
          status: 'booked',
          name: 'Morning session',
          start_location_display_name: null,
          finish_location_display_name: null,
        },
      ],
    });

    const derived = deriveParticipantItinerary(raw);
    const day10 = derived.dayGroups.find((g) => g.dayKey === '2026-01-10');
    expect(day10).toBeDefined();
    expect(day10?.entries.map((e) => `${e.resourceType}:${e.entryKind}`)).toEqual([
      'activity:start',
      'transport:departure',
    ]);
  });
});
