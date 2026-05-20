import type { ItineraryResourceType } from '@solvera/pace-core/itinerary';

export type TracResourceType = ItineraryResourceType;

export type TracItineraryAssignmentRow = {
  id: string;
  application_id: string;
  event_id: string;
  organisation_id: string;
  resource_id: string;
  resource_type: TracResourceType;
};

export type TracTransportRow = {
  id: string;
  event_id: string;
  departure_time: string;
  arrival_time: string;
  departure_timezone: string | null;
  arrival_timezone: string | null;
  status: string | null;
  transport_number: string | null;
  departure_display_name: string | null;
  arrival_display_name: string | null;
  departure_short_address: string | null;
  arrival_short_address: string | null;
  mode: string;
  notes: string | null;
};

export type TracActivityRow = {
  id: string;
  event_id: string;
  start_time: string;
  finish_time: string;
  start_location_timezone: string | null;
  finish_location_timezone: string | null;
  status: string | null;
  name: string;
  start_location_display_name: string | null;
  finish_location_display_name: string | null;
};

export type TracAccommodationRow = {
  id: string;
  event_id: string;
  check_in_time: string;
  check_out_time: string;
  location_timezone: string | null;
  status: string | null;
  name: string;
  location_display_name: string | null;
  location_short_address: string | null;
};
