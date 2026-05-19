import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ok, err } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import type { ApplicationProgressCheckRow } from '@/lib/applicationProgressContracts';
import * as hub from '@/hooks/events/useEventHub';
import * as progressFetch from '@/lib/fetchApplicationProgress';
import { useApplicationProgress } from '@/hooks/events/useApplicationProgress';

const sampleEvent = {
  event_id: '22222222-2222-4222-a222-222222222222',
  event_name: 'Camp',
  event_code: 'camp',
  organisation_id: 'org-1',
} as Database['public']['Tables']['core_events']['Row'];

function hubPayload(progressEventId = sampleEvent.event_id as string) {
  return {
    application: {
      id: '11111111-1111-4111-a111-111111111111',
      event_id: progressEventId,
      organisation_id: 'org-1',
      person_id: '44444444-4444-4444-a444-444444444444',
      registration_type_id: '55555555-5555-4555-a555-555555555555',
      form_id: null,
      referee_name: null,
      status: 'submitted',
      submitted_at: null,
    },
    registration_type: {
      id: '77777777-7777-4777-a777-777777777777',
      name: 'Day',
      description: null,
    },
    checks: [
      {
        id: '88888888-8888-4888-a888-888888888888',
        requirement_id: '99999999-9999-4999-a999-999999999999',
        sort_order: 1,
        check_type: 'payment',
        participant_check_label: 'Payment',
        status: 'pending' as const,
      },
      {
        id: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
        requirement_id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
        sort_order: 2,
        check_type: 'referee',
        participant_check_label: 'Referee approval',
        status: 'satisfied' as const,
      },
    ],
  };
}

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1', name: 'Org' },
    organisations: [{ id: 'org-1' }],
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

describe('useApplicationProgress', () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    qc.clear();
    vi.spyOn(hub, 'lookupEventRowBySlug').mockResolvedValue(ok(sampleEvent));
    vi.spyOn(progressFetch, 'fetchApplicationProgress').mockResolvedValue(ok(hubPayload()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  const appId = '11111111-1111-4111-a111-111111111111';

  it('skips RPC when application id is not a UUID', async () => {
    const { result } = renderHook(() => useApplicationProgress('camp', 'not-a-uuid'), { wrapper });

    await waitFor(() => expect(result.current.phase).toBe('invalid_id'));
    expect(progressFetch.fetchApplicationProgress).not.toHaveBeenCalled();
  });

  it('reaches ready with checks when RPC succeeds for the resolved event', async () => {
    const { result } = renderHook(() => useApplicationProgress('camp', appId), { wrapper });

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(
      result.current.data?.progress.checks.map(
        (c: ApplicationProgressCheckRow) => c.participant_check_label
      )
    ).toEqual(['Payment', 'Referee approval']);
    expect(progressFetch.fetchApplicationProgress).toHaveBeenCalledWith(
      expect.anything(),
      appId.toLowerCase()
    );
  });

  it('surfaces access_denied when RPC denies', async () => {
    vi.spyOn(progressFetch, 'fetchApplicationProgress').mockResolvedValue(
      err({ code: 'APPLICATION_PROGRESS_ACCESS_DENIED', message: 'You cannot view this application.' })
    );
    const { result } = renderHook(() => useApplicationProgress('camp', appId), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('access_denied'));
  });

  it('treats event id mismatch after success as access_denied', async () => {
    vi.spyOn(progressFetch, 'fetchApplicationProgress').mockResolvedValue(
      ok(hubPayload('aaaaaaaa-aaaa-4aaa-a000-aaaaaaaaaaaa'))
    );
    const { result } = renderHook(() => useApplicationProgress('camp', appId), { wrapper });
    await waitFor(() => expect(result.current.phase).toBe('access_denied'));
  });
});
