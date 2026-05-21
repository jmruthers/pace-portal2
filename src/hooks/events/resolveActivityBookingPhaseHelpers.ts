import { isOk } from '@solvera/pace-core/types';
import { isActivityBookingAccessDenied } from '@/lib/activityBookingRules';
import type { UseActivityBookingResult } from '@/hooks/events/useActivityBooking';
import type { ResolveActivityBookingPhaseInput } from '@/hooks/events/resolveActivityBookingPhaseTypes';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

export type ActivityBookingPhaseBase = Omit<UseActivityBookingResult, 'phase' | 'data' | 'notFound'> & {
  data: undefined;
  notFound: boolean;
};

type QueryError = { error: { code?: string; message?: string } };

export function buildActivityBookingPhaseBase(
  input: ResolveActivityBookingPhaseInput
): ActivityBookingPhaseBase {
  const { routing, mutations } = input;
  return {
    data: undefined,
    errorMessage: null,
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
}

export function phaseResult(
  base: ActivityBookingPhaseBase,
  phase: UseActivityBookingResult['phase'],
  overrides?: Partial<Pick<UseActivityBookingResult, 'errorMessage' | 'notFound' | 'data'>>
): UseActivityBookingResult {
  return { ...base, phase, ...overrides };
}

export function accessDeniedOrErrorPhase(
  base: ActivityBookingPhaseBase,
  message: string,
  deniedMessage: string
): UseActivityBookingResult | null {
  if (isActivityBookingAccessDenied(message)) {
    return phaseResult(base, 'access_denied', { errorMessage: deniedMessage });
  }
  if (message !== '') {
    return phaseResult(base, 'error', { errorMessage: message });
  }
  return null;
}

export function resolveRoutingAndAuthPhase(
  input: ResolveActivityBookingPhaseInput,
  base: ActivityBookingPhaseBase
): UseActivityBookingResult | null {
  const { routing, auth } = input;
  if (routing.reserved) {
    return phaseResult(base, 'reserved');
  }
  if (routing.slug === '') {
    return phaseResult(base, 'not_found', { notFound: true });
  }
  if (!auth.client || !auth.userId || !auth.organisationId || auth.orgIdsLength === 0) {
    return phaseResult(base, 'loading_context');
  }
  return null;
}

export function resolveEventPhase(
  input: ResolveActivityBookingPhaseInput,
  base: ActivityBookingPhaseBase
): UseActivityBookingResult | null {
  const { event } = input;
  if (event.loading) {
    return phaseResult(base, 'loading');
  }
  if (event.data != null && !isOk(event.data)) {
    const e = event.data.error;
    if (e.code === 'EVENT_NOT_FOUND') {
      return phaseResult(base, 'not_found', { notFound: true });
    }
    return phaseResult(base, 'error', { errorMessage: e.message ?? 'Could not load event.' });
  }
  if (!event.row) {
    return phaseResult(base, 'not_found', { notFound: true });
  }
  return null;
}

export function resolvePersonPhase(
  input: ResolveActivityBookingPhaseInput,
  base: ActivityBookingPhaseBase
): UseActivityBookingResult | null {
  const { person } = input;
  if (person.loading) {
    return phaseResult(base, 'loading');
  }
  if (person.data != null && !isOk(person.data)) {
    const personErr = person.data as QueryError;
    if (personErr.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
      return phaseResult(base, 'needs_profile');
    }
    return phaseResult(base, 'error', {
      errorMessage: personErr.error.message ?? 'Could not load profile.',
    });
  }
  if (!person.personId) {
    return phaseResult(base, 'needs_profile');
  }
  return null;
}

export function resolveApplicationPhase(
  input: ResolveActivityBookingPhaseInput,
  base: ActivityBookingPhaseBase
): UseActivityBookingResult | null {
  const { application } = input;
  if (application.loading) {
    return phaseResult(base, 'loading');
  }
  if (application.data != null && !isOk(application.data)) {
    const msg = application.data.error.message ?? '';
    const denied = accessDeniedOrErrorPhase(
      base,
      msg,
      'You cannot book activities for this event.'
    );
    if (denied) {
      return denied;
    }
    return phaseResult(base, 'error', {
      errorMessage: application.data.error.message ?? 'Could not load application.',
    });
  }
  if (application.row == null) {
    return phaseResult(base, 'no_application');
  }
  return null;
}

export function resolveBrowseBookingsPhase(
  input: ResolveActivityBookingPhaseInput,
  base: ActivityBookingPhaseBase
): UseActivityBookingResult | null {
  const { browse, bookings, waiver } = input;
  if (browse.loading || bookings.loading || waiver.loading) {
    return phaseResult(base, 'loading');
  }

  const browseErr = browse.data != null && !isOk(browse.data) ? browse.data : null;
  const bookingsErr = bookings.data != null && !isOk(bookings.data) ? bookings.data : null;
  const waiverErr = waiver.data != null && !isOk(waiver.data) ? waiver.data : null;

  if (browseErr) {
    const denied = accessDeniedOrErrorPhase(
      base,
      browseErr.error.message ?? '',
      'You cannot view activities for this event.'
    );
    if (denied) {
      return denied;
    }
  }

  if (bookingsErr) {
    const denied = accessDeniedOrErrorPhase(
      base,
      bookingsErr.error.message ?? '',
      'You cannot view your bookings for this event.'
    );
    if (denied) {
      return denied;
    }
  }

  if (waiverErr) {
    const denied = accessDeniedOrErrorPhase(
      base,
      waiverErr.error.message ?? '',
      'You cannot view activity consent for this event.'
    );
    if (denied) {
      return denied;
    }
  }

  return null;
}
