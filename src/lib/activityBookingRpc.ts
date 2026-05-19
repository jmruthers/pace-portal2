/**
 * BA11 — Activity booking create/cancel RPC bridge (participant self-service, PR19).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import type { ActivityBookingCreateResult } from '@/lib/activityBookingTypes';
import {
  isActivityBookingAccessDenied,
  mapActivityBookingRpcMessage,
  parseActivityBookingCreateResult,
} from '@/lib/activityBookingRules';

const BOOKING_SOURCE_SELF = 'self_service';
const CANCEL_SOURCE_SELF = 'self_service';

export async function createActivityBooking(
  client: SupabaseClient<Database>,
  args: {
    eventId: string;
    applicationId: string;
    sessionId: string;
    organisationId: string;
  }
): Promise<ApiResult<ActivityBookingCreateResult>> {
  const { data, error } = await client.rpc('app_base_activity_booking_create',
    {
      p_event_id: args.eventId.trim(),
      p_application_id: args.applicationId.trim(),
      p_session_id: args.sessionId.trim(),
      p_organisation_id: args.organisationId.trim(),
      p_source: BOOKING_SOURCE_SELF,
      p_promote_from_waitlist: false,
      p_override_capacity: false,
      p_override_window: false,
      p_override_conflict: false,
      p_override_reason: undefined,
      p_override_by: undefined,
    }
  );

  if (error) {
    const msg = error.message?.trim() ?? '';
    const mapped = mapActivityBookingRpcMessage(msg);
    return err({
      code: mapped.code,
      message: mapped.participantMessage,
    });
  }

  const parsed = parseActivityBookingCreateResult(data);
  if (!parsed.ok) {
    return err({
      code: 'ACTIVITY_BOOKING_SHAPE',
      message: 'Booking response was not in the expected format.',
    });
  }

  return ok(parsed.data);
}

export async function cancelActivityBooking(
  client: SupabaseClient<Database>,
  args: {
    bookingId: string;
    cancelledBy: string;
  }
): Promise<ApiResult<void>> {
  // BA11 RPC requires override audit params; empty p_override_reason means participant self-service (no staff override).
  const { error } = await client.rpc('app_base_activity_booking_cancel',
    {
      p_booking_id: args.bookingId.trim(),
      p_cancelled_by: args.cancelledBy.trim(),
      p_source: CANCEL_SOURCE_SELF,
      p_reason: '',
      p_override_reason: '',
      p_override_by: args.cancelledBy.trim(),
      p_override_at: new Date().toISOString(),
    }
  );

  if (error) {
    const msg = error.message?.trim() ?? '';
    if (isActivityBookingAccessDenied(msg)) {
      return err({
        code: 'ACTIVITY_BOOKING_ACCESS_DENIED',
        message: 'You cannot cancel this booking.',
      });
    }
    const mapped = mapActivityBookingRpcMessage(msg);
    return err({
      code: mapped.code,
      message: mapped.participantMessage,
    });
  }

  return ok(undefined);
}
