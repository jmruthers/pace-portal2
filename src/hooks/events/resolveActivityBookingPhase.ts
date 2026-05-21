/**
 * PR19 — Derives activity booking hook phase from query snapshots.
 */
import type {
  ActivityBookingDataReady,
  ActivityBookingPhase,
  UseActivityBookingResult,
} from '@/hooks/events/useActivityBooking';
import type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';
import {
  buildActivityBookingPhaseBase,
  phaseResult,
  resolveApplicationPhase,
  resolveBrowseBookingsPhase,
  resolveEventPhase,
  resolvePersonPhase,
  resolveRoutingAndAuthPhase,
} from '@/hooks/events/resolveActivityBookingPhaseHelpers';

export type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';

export function resolveActivityBookingPhase(
  input: ResolveActivityBookingPhaseInput
): UseActivityBookingResult {
  const base = buildActivityBookingPhaseBase(input);

  const routing = resolveRoutingAndAuthPhase(input, base);
  if (routing) {
    return routing;
  }

  const eventPhase = resolveEventPhase(input, base);
  if (eventPhase) {
    return eventPhase;
  }

  const personPhase = resolvePersonPhase(input, base);
  if (personPhase) {
    return personPhase;
  }

  const applicationPhase = resolveApplicationPhase(input, base);
  if (applicationPhase) {
    return applicationPhase;
  }

  const browsePhase = resolveBrowseBookingsPhase(input, base);
  if (browsePhase) {
    return browsePhase;
  }

  const { event, application, browse, bookings } = input;
  const readyData: ActivityBookingDataReady = {
    event: event.row!,
    application: application.row!,
    offerings: browse.offerings,
    bookings: bookings.bookings,
  };

  const phase: ActivityBookingPhase =
    application.row!.status !== 'approved' ? 'not_approved' : 'ready';

  return phaseResult(base, phase, { data: readyData });
}
