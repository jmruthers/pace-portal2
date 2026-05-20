import type { ItineraryEntryKind, ItineraryResourceType } from '@solvera/pace-core/itinerary';

export function entryKindLabel(kind: ItineraryEntryKind): string {
  switch (kind) {
    case 'departure':
      return 'Departure';
    case 'arrival':
      return 'Arrival';
    case 'start':
      return 'Start';
    case 'finish':
      return 'Finish';
    case 'check-in':
      return 'Check-in';
    case 'check-out':
      return 'Check-out';
    case 'occupied':
      return 'Stay';
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

export function resourceTypeLabel(type: ItineraryResourceType): string {
  switch (type) {
    case 'transport':
      return 'Transport';
    case 'activity':
      return 'Activity';
    case 'accommodation':
      return 'Accommodation';
    default: {
      const neverType: never = type;
      return neverType;
    }
  }
}
