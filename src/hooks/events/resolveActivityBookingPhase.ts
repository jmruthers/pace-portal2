/**
 * PR19 — Derives activity booking hook phase from query snapshots.
 */
import { isOk } from '@solvera/pace-core/types';
import { isActivityBookingAccessDenied } from '@/lib/activityBookingContracts';
import type {
  ActivityBookingDataReady,
  ActivityBookingPhase,
  UseActivityBookingResult,
} from '@/hooks/events/useActivityBooking';
import type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

export type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';

type QueryError = { error: { code?: string; message?: string } };

/* eslint-disable complexity -- PR19 phase resolver: sequential query/error gates. */
export function resolveActivityBookingPhase(
  input: ResolveActivityBookingPhaseInput
): UseActivityBookingResult {
  const { routing, auth, mutations, event, person, application, browse, bookings, waiver } =
    input;

  const base = {
    data: undefined as ActivityBookingDataReady | undefined,
    errorMessage: null as string | null,
    notFound: false,
    reservedSlug: routing.reserved,
    refetch: mutations.refetchAll,
    validateSession: mutations.validateSession,
    bookSession: mutations.bookSession,
    cancelBooking: mutations.cancelBooking,
    bookPending: mutations.bookPending,
    cancelPending: mutations.cancelPending,
    lastActionError: mutations.lastActionError,
    clearLastActionError: mutations.clearLastActionError,
  };

  if (routing.reserved) {
    return { ...base, phase: 'reserved' };
  }

  if (routing.slug === '') {
    return { ...base, phase: 'not_found', notFound: true };
  }

  if (!auth.client || !auth.userId || !auth.organisationId || auth.orgIdsLength === 0) {
    return { ...base, phase: 'loading_context' };
  }

  if (event.loading) {
    return { ...base, phase: 'loading' };
  }

  if (event.data != null && !isOk(event.data)) {
    const e = event.data.error;
    if (e.code === 'EVENT_NOT_FOUND') {
      return { ...base, phase: 'not_found', notFound: true };
    }
    return { ...base, phase: 'error', errorMessage: e.message ?? 'Could not load event.' };
  }

  if (!event.row) {
    return { ...base, phase: 'not_found', notFound: true };
  }

  if (person.loading) {
    return { ...base, phase: 'loading' };
  }

  if (person.data != null && !isOk(person.data)) {
    const personErr = person.data as QueryError;
    if (personErr.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
      return { ...base, phase: 'needs_profile' };
    }
    return {
      ...base,
      phase: 'error',
      errorMessage: personErr.error.message ?? 'Could not load profile.',
    };
  }

  if (!person.personId) {
    return { ...base, phase: 'needs_profile' };
  }

  if (application.loading) {
    return { ...base, phase: 'loading' };
  }

  if (application.data != null && !isOk(application.data)) {
    const msg = application.data.error.message ?? '';
    if (isActivityBookingAccessDenied(msg)) {
      return {
        ...base,
        phase: 'access_denied',
        errorMessage: 'You cannot book activities for this event.',
      };
    }
    return {
      ...base,
      phase: 'error',
      errorMessage: application.data.error.message ?? 'Could not load application.',
    };
  }

  if (application.row == null) {
    return { ...base, phase: 'no_application' };
  }

  if (browse.loading || bookings.loading || waiver.loading) {
    return { ...base, phase: 'loading' };
  }

  const browseErr = browse.data != null && !isOk(browse.data) ? browse.data : null;
  const bookingsErr = bookings.data != null && !isOk(bookings.data) ? bookings.data : null;
  const waiverErr = waiver.data != null && !isOk(waiver.data) ? waiver.data : null;

  if (browseErr) {
    const msg = browseErr.error.message ?? '';
    if (isActivityBookingAccessDenied(msg)) {
      return { ...base, phase: 'access_denied', errorMessage: 'You cannot view activities for this event.' };
    }
    return { ...base, phase: 'error', errorMessage: browseErr.error.message };
  }

  if (bookingsErr) {
    const msg = bookingsErr.error.message ?? '';
    if (isActivityBookingAccessDenied(msg)) {
      return {
        ...base,
        phase: 'access_denied',
        errorMessage: 'You cannot view your bookings for this event.',
      };
    }
    return { ...base, phase: 'error', errorMessage: bookingsErr.error.message };
  }

  if (waiverErr) {
    const msg = waiverErr.error.message ?? '';
    if (isActivityBookingAccessDenied(msg)) {
      return {
        ...base,
        phase: 'access_denied',
        errorMessage: 'You cannot view activity consent for this event.',
      };
    }
    return { ...base, phase: 'error', errorMessage: waiverErr.error.message };
  }

  const readyData: ActivityBookingDataReady = {
    event: event.row,
    application: application.row,
    offerings: browse.offerings,
    bookings: bookings.bookings,
  };

  const phase: ActivityBookingPhase =
    application.row.status !== 'approved' ? 'not_approved' : 'ready';

  return {
    ...base,
    phase,
    data: readyData,
  };
}
