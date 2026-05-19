import { describe, expect, it, vi } from 'vitest';
import { err } from '@solvera/pace-core/types';
import { fetchApplicationProgress } from '@/lib/fetchApplicationProgress';

function makeClient(mockRpc: ReturnType<typeof vi.fn>) {
  return {
    rpc: mockRpc,
  } as unknown as import('@supabase/supabase-js').SupabaseClient<import('@/types/pace-database').Database>;
}

describe('fetchApplicationProgress', () => {
  it('maps shaped JSON to ok ApiResult', async () => {
    const payload = {
      application: {
        id: '11111111-1111-4111-a111-111111111111',
        event_id: '22222222-2222-4222-a222-222222222222',
        organisation_id: '33333333-3333-4333-a333-333333333333',
        person_id: '44444444-4444-4444-a444-444444444444',
        registration_type_id: '55555555-5555-4555-a555-555555555555',
        form_id: null,
        referee_name: null,
        status: 'submitted',
        submitted_at: null,
      },
      registration_type: {
        id: '77777777-7777-4777-a777-777777777777',
        name: 'Camp',
        description: 'Desc',
      },
      checks: [],
    };
    const rpc = vi.fn().mockResolvedValue({ data: payload, error: null });
    const r = await fetchApplicationProgress(makeClient(rpc), '11111111-1111-4111-a111-111111111111');
    expect(r.ok && r.data.application.status === 'submitted').toBe(true);
    expect(rpc).toHaveBeenCalledWith('app_base_application_progress_get', {
      p_application_id: '11111111-1111-4111-a111-111111111111',
    });
  });

  it('maps base_application_access_denied to APPLICATION_PROGRESS_ACCESS_DENIED', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'base_application_access_denied' } });
    const r = await fetchApplicationProgress(makeClient(rpc), '11111111-1111-4111-a111-111111111111');
    expect(!r.ok && r.error.code === 'APPLICATION_PROGRESS_ACCESS_DENIED').toBe(true);
  });

  it('returns APPLICATION_PROGRESS_SHAPE on malformed success body', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { wrong: true }, error: null });
    const r = await fetchApplicationProgress(makeClient(rpc), '11111111-1111-4111-a111-111111111111');
    expect(!r.ok && r.error.code === 'APPLICATION_PROGRESS_SHAPE').toBe(true);
  });

  it('returns APPLICATION_PROGRESS_RPC on other RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'network hiccup' } });
    const r = await fetchApplicationProgress(makeClient(rpc), '11111111-1111-4111-a111-111111111111');
    expect(!r.ok && r.error.code === 'APPLICATION_PROGRESS_RPC').toBe(true);
  });

  it('wraps empty application id as shape error', async () => {
    const rpc = vi.fn();
    const r = await fetchApplicationProgress(makeClient(rpc), '   ');
    expect(r).toEqual(err({ code: 'APPLICATION_PROGRESS_SHAPE', message: 'Application id is required.' }));
    expect(rpc).not.toHaveBeenCalled();
  });
});
