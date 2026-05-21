import { isOk, type ApiResult } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import type { ParticipantItineraryDerived } from '@/lib/participantItineraryContracts';
import type { ParticipantApplicationContext } from '@/lib/activityBookingTypes';
import type {
  ParticipantItineraryDataReady,
  UseParticipantItineraryResult,
} from '@/hooks/events/useParticipantItinerary';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

type QueryErr = { code?: string; message?: string };

export type ResolveParticipantItineraryInput = {
  reserved: boolean;
  slug: string;
  clientReady: boolean;
  itineraryClientReady: boolean;
  userId: string | null;
  organisationId: string | null;
  orgIdsLength: number;
  eventLoading: boolean;
  eventData: ApiResult<Database['public']['Tables']['core_events']['Row']> | undefined;
  eventRow: Database['public']['Tables']['core_events']['Row'] | undefined;
  personLoading: boolean;
  personData: ApiResult<{ person: { id: string }; member: unknown }> | undefined;
  applicationLoading: boolean;
  applicationData: ApiResult<ParticipantApplicationContext | null> | undefined;
  application: ParticipantApplicationContext | undefined;
  itineraryLoading: boolean;
  itineraryData: ApiResult<unknown> | undefined;
  derived: ParticipantItineraryDerived | undefined;
  refetch: () => Promise<unknown[]>;
};

function baseResult(input: ResolveParticipantItineraryInput) {
  return {
    data: undefined as ParticipantItineraryDataReady | undefined,
    errorMessage: null as string | null,
    notFound: false,
    reservedSlug: input.reserved,
    refetch: input.refetch,
  };
}

export function resolveParticipantItineraryPhase(
  input: ResolveParticipantItineraryInput
): UseParticipantItineraryResult {
  const base = baseResult(input);

  if (input.reserved) {
    return { ...base, phase: 'reserved' };
  }

  if (input.slug === '') {
    return { ...base, phase: 'not_found', notFound: true };
  }

  if (
    !input.clientReady ||
    !input.itineraryClientReady ||
    !input.userId ||
    !input.organisationId ||
    input.orgIdsLength === 0
  ) {
    return { ...base, phase: 'loading_context' };
  }

  const eventPhase = resolveEventSlice(input, base);
  if (eventPhase) {
    return eventPhase;
  }

  const personPhase = resolvePersonSlice(input, base);
  if (personPhase) {
    return personPhase;
  }

  const applicationPhase = resolveApplicationSlice(input, base);
  if (applicationPhase) {
    return applicationPhase;
  }

  return resolveItinerarySlice(input, base);
}

function resolveEventSlice(
  input: ResolveParticipantItineraryInput,
  base: ReturnType<typeof baseResult>
): UseParticipantItineraryResult | null {
  if (input.eventLoading) {
    return { ...base, phase: 'loading' };
  }
  if (input.eventData != null && !isOk(input.eventData)) {
    const e = input.eventData.error as QueryErr;
    if (e.code === 'EVENT_NOT_FOUND') {
      return { ...base, phase: 'not_found', notFound: true };
    }
    return { ...base, phase: 'error', errorMessage: e.message ?? 'Could not load event.' };
  }
  if (!input.eventRow) {
    return { ...base, phase: 'not_found', notFound: true };
  }
  return null;
}

function resolvePersonSlice(
  input: ResolveParticipantItineraryInput,
  base: ReturnType<typeof baseResult>
): UseParticipantItineraryResult | null {
  if (input.personLoading) {
    return { ...base, phase: 'loading' };
  }
  if (input.personData != null && !isOk(input.personData)) {
    const err = input.personData.error as QueryErr;
    if (err.code === NO_PERSON_PROFILE_ERROR_CODE) {
      return { ...base, phase: 'needs_profile' };
    }
    return { ...base, phase: 'error', errorMessage: err.message ?? 'Could not load profile.' };
  }
  return null;
}

function resolveApplicationSlice(
  input: ResolveParticipantItineraryInput,
  base: ReturnType<typeof baseResult>
): UseParticipantItineraryResult | null {
  if (input.applicationLoading) {
    return { ...base, phase: 'loading' };
  }
  if (input.applicationData != null && !isOk(input.applicationData)) {
    const err = input.applicationData.error as QueryErr;
    return {
      ...base,
      phase: 'error',
      errorMessage: err.message ?? 'Could not load application.',
    };
  }
  if (input.application == null) {
    return { ...base, phase: 'not_scoped' };
  }
  return null;
}

function resolveItinerarySlice(
  input: ResolveParticipantItineraryInput,
  base: ReturnType<typeof baseResult>
): UseParticipantItineraryResult {
  if (input.itineraryLoading) {
    return { ...base, phase: 'loading' };
  }
  if (input.itineraryData != null && !isOk(input.itineraryData)) {
    const err = input.itineraryData.error as QueryErr;
    const code = err.code ?? '';
    if (code.includes('PERMISSION') || code.includes('RLS') || code.includes('DENIED')) {
      return { ...base, phase: 'access_denied' };
    }
    return {
      ...base,
      phase: 'error',
      errorMessage: err.message ?? 'Could not load itinerary.',
    };
  }
  if (!input.derived) {
    return { ...base, phase: 'loading' };
  }
  if (input.derived.days.length === 0) {
    return { ...base, phase: 'ready_empty' };
  }
  return {
    ...base,
    phase: 'ready',
    data: {
      event: input.eventRow!,
      applicationId: input.application!.id,
      itinerary: input.derived,
    },
  };
}
