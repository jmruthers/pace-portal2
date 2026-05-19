import { describe, expect, it, vi } from 'vitest';
import { persistActivityBookingConsent } from '@/lib/persistActivityBookingConsent';
import { ACTIVITY_WAIVER_CONSENT_TYPE } from '@/lib/activityBookingConsent';

function makeClient(insert: ReturnType<typeof vi.fn>) {
  return {
    from: vi.fn().mockReturnValue({ insert }),
  } as unknown as import('@supabase/supabase-js').SupabaseClient<
    import('@/types/pace-database').Database
  >;
}

const baseInput = {
  bookingId: 'book-1',
  applicationId: 'app-1',
  eventId: 'ev-1',
  organisationId: 'org-1',
  consentedByPersonId: 'person-a',
  consentedForPersonId: 'person-b',
  verbatimText: 'Activity waiver text',
  createdByUserId: 'user-1',
};

describe('persistActivityBookingConsent', () => {
  it('inserts application_id with waiver fields for waiver lookup', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = makeClient(insert);

    const result = await persistActivityBookingConsent(client, baseInput);

    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      application_id: 'app-1',
      booking_id: 'book-1',
      event_id: 'ev-1',
      organisation_id: 'org-1',
      consent_type: ACTIVITY_WAIVER_CONSENT_TYPE,
      verbatim_text: 'Activity waiver text',
      consented_by: 'person-a',
      consented_for: 'person-b',
      created_by: 'user-1',
    });
  });

  it('rejects empty application id', async () => {
    const insert = vi.fn();
    const result = await persistActivityBookingConsent(makeClient(insert), {
      ...baseInput,
      applicationId: '   ',
    });
    expect(!result.ok && result.error.code === 'ACTIVITY_CONSENT_SHAPE').toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
});
