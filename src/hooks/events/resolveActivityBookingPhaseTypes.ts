/**
 * PR19 — Input slices for {@link resolveActivityBookingPhase} (ISP / audit threshold).
 */
import type { ApiResult } from '@solvera/pace-core/types';
import type {
  ActivityBookingDataReady,
  UseActivityBookingResult,
} from '@/hooks/events/useActivityBooking';

export type ActivityBookingPhaseRouting = {
  reserved: boolean;
  slug: string;
};

export type ActivityBookingPhaseAuth = {
  client: unknown;
  userId: string | null;
  organisationId: string | null;
  orgIdsLength: number;
};

export type ActivityBookingPhaseMutations = {
  refetchAll: UseActivityBookingResult['refetch'];
  validateSession: UseActivityBookingResult['validateSession'];
  bookSession: UseActivityBookingResult['bookSession'];
  cancelBooking: UseActivityBookingResult['cancelBooking'];
  bookPending: boolean;
  cancelPending: boolean;
  lastActionError: string | null;
  clearLastActionError: () => void;
};

export type ActivityBookingPhaseEventQuery = {
  loading: boolean;
  data: ApiResult<ActivityBookingDataReady['event']> | undefined;
  row: ActivityBookingDataReady['event'] | undefined;
};

export type ActivityBookingPhasePersonQuery = {
  loading: boolean;
  data: ApiResult<unknown> | undefined;
  personId: string | null;
};

export type ActivityBookingPhaseApplicationQuery = {
  loading: boolean;
  data: ApiResult<ActivityBookingDataReady['application'] | null> | undefined;
  row: ActivityBookingDataReady['application'] | undefined;
};

export type ActivityBookingPhaseBrowseQuery = {
  loading: boolean;
  data: ApiResult<ActivityBookingDataReady['offerings']> | undefined;
  offerings: ActivityBookingDataReady['offerings'];
};

export type ActivityBookingPhaseBookingsQuery = {
  loading: boolean;
  data: ApiResult<ActivityBookingDataReady['bookings']> | undefined;
  bookings: ActivityBookingDataReady['bookings'];
};

export type ActivityBookingPhaseWaiverQuery = {
  loading: boolean;
  data: ApiResult<ReadonlySet<string>> | undefined;
};

export type ResolveActivityBookingPhaseInput = {
  routing: ActivityBookingPhaseRouting;
  auth: ActivityBookingPhaseAuth;
  mutations: ActivityBookingPhaseMutations;
  event: ActivityBookingPhaseEventQuery;
  person: ActivityBookingPhasePersonQuery;
  application: ActivityBookingPhaseApplicationQuery;
  browse: ActivityBookingPhaseBrowseQuery;
  bookings: ActivityBookingPhaseBookingsQuery;
  waiver: ActivityBookingPhaseWaiverQuery;
};
