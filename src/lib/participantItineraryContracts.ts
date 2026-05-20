import type { DerivedItineraryDayEntry, ItineraryDayGroup } from '@solvera/pace-core/itinerary';
import type {
  TracAccommodationRow,
  TracActivityRow,
  TracItineraryAssignmentRow,
  TracTransportRow,
} from '@/lib/participantItineraryRows';

export type { TracAccommodationRow, TracActivityRow, TracItineraryAssignmentRow, TracTransportRow, TracResourceType } from '@/lib/participantItineraryRows';

export type ParticipantItineraryRawData = {
  applicationId: string;
  assignments: TracItineraryAssignmentRow[];
  transport: TracTransportRow[];
  activities: TracActivityRow[];
  accommodations: TracAccommodationRow[];
};

export type ParticipantItineraryDisplayItem = {
  entry: DerivedItineraryDayEntry;
  title: string;
  detail: string | null;
  whenLabel: string | null;
};

export type ParticipantItineraryDayView = {
  dayKey: string;
  items: ParticipantItineraryDisplayItem[];
};

export type ParticipantItineraryDerived = {
  dayGroups: ItineraryDayGroup[];
  days: ParticipantItineraryDayView[];
};
