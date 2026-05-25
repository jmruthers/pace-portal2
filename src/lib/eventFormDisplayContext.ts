import type { FileReference } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';

type EventRow = Database['public']['Tables']['core_events']['Row'];

export type EventFormPresentation = {
  eventName: string;
  eventDate: string | null;
  eventEmail: string | null;
  eventVenue: string | null;
  eventDescription: string | null;
  logoRef: FileReference | null;
  logoBusy: boolean;
  logoRefsFailed: boolean;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t !== '' ? t : null;
}

export function resolveEventContactEmail(event: EventRow): string | null {
  return trimOrNull(event.event_email) ?? trimOrNull(event.participant_admin_email);
}

/** Participant-facing event description from `core_events.description` only. */
export function resolveEventDescription(event: EventRow): string | null {
  return trimOrNull(event.description);
}

export function buildEventFormPresentation(
  event: EventRow,
  logoRef: FileReference | null,
  logoBusy: boolean,
  logoRefsFailed: boolean
): EventFormPresentation {
  return {
    eventName: event.event_name,
    eventDate: trimOrNull(event.event_date),
    eventEmail: resolveEventContactEmail(event),
    eventVenue: trimOrNull(event.event_venue),
    eventDescription: resolveEventDescription(event),
    logoRef,
    logoBusy,
    logoRefsFailed,
  };
}
