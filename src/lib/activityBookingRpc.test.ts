import { describe, expect, it, vi } from 'vitest';
import { cancelActivityBooking, createActivityBooking } from '@/lib/activityBookingRpc';

function makeClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient<
    import('@/types/pace-database').Database
  >;
}

describe('activityBookingRpc', () => {
  it('create maps success json', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { booking_id: 'b1', status: 'confirmed' },
      error: null,
    });
    const r = await createActivityBooking(makeClient(rpc), {
      eventId: 'ev',
      applicationId: 'app',
      sessionId: 'sess',
      organisationId: 'org',
    });
    expect(r.ok && r.data.status === 'confirmed').toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'app_base_activity_booking_create',
      expect.objectContaining({ p_source: 'self_service' })
    );
  });

  it('create maps base_booking_window_closed', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'base_booking_window_closed' },
    });
    const r = await createActivityBooking(makeClient(rpc), {
      eventId: 'ev',
      applicationId: 'app',
      sessionId: 'sess',
      organisationId: 'org',
    });
    expect(!r.ok && r.error.code === 'ACTIVITY_BOOKING_WINDOW_CLOSED').toBe(true);
  });

  it('cancel maps access denied', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'base_booking_access_denied' },
    });
    const r = await cancelActivityBooking(makeClient(rpc), {
      bookingId: 'b1',
      cancelledBy: 'user-1',
    });
    expect(!r.ok && r.error.code === 'ACTIVITY_BOOKING_ACCESS_DENIED').toBe(true);
  });

  it('cancel succeeds without data', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const r = await cancelActivityBooking(makeClient(rpc), {
      bookingId: 'b1',
      cancelledBy: 'user-1',
    });
    expect(r.ok).toBe(true);
  });
});
