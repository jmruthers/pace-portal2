import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok } from '@solvera/pace-core/types';
import { useFormJourney } from '@/hooks/forms/useFormJourney';
import type { FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';

const fetchSubmittedMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/fetchSubmittedRegistrationSnapshot', () => ({
  fetchSubmittedRegistrationSnapshot: (...a: unknown[]) => fetchSubmittedMock(...a),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

function draftStub(over: Record<string, unknown> = {}) {
  return {
    applicationId: null as string | null,
    responseId: 'r1',
    valueByFieldId: {} as Record<string, unknown>,
    isHydrating: false,
    hydrateError: null as string | null,
    scheduleSaveDraft: vi.fn(),
    saveDraftNow: vi.fn(),
    isSavingDraft: false,
    saveDraftError: null as string | null,
    refetchBundle: vi.fn(),
    ...over,
  };
}

const readyEvent = {
  kind: 'event' as const,
  event: { event_name: 'E', event_id: 'ev1' },
  form: {
    id: 'f1',
    workflow_type: 'base_registration',
    title: 'T',
    name: 'T',
    description: null,
  },
  fieldRows: [],
  confirmationKeys: [],
} as unknown as FormJourneyReady;

describe('useFormJourney', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSubmittedMock.mockResolvedValue(ok(null));
  });

  it('starts at filling when there is no draft and no submitted record', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () =>
        useFormJourney({
          entry: {
            data: readyEvent,
            isLoading: false,
            error: null,
            reservedSlug: false,
          },
          ready: readyEvent,
          draft: draftStub() as never,
          effectivePersonId: 'p1',
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('filling'));
  });

  it('uses viewing phase when draft hydrate indicates already submitted', async () => {
    fetchSubmittedMock.mockResolvedValue(ok(null));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () =>
        useFormJourney({
          entry: {
            data: readyEvent,
            isLoading: false,
            error: null,
            reservedSlug: false,
          },
          ready: readyEvent,
          draft: draftStub({
            hydrateError:
              'You have already submitted an application for this event. Use Manage on the dashboard to view your application progress.',
          }) as never,
          effectivePersonId: 'p1',
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('view_submitted'));
  });

  it('stays filling in proxy when hydrate error is only for the acting user', async () => {
    fetchSubmittedMock.mockResolvedValue(ok(null));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () =>
        useFormJourney({
          entry: {
            data: readyEvent,
            isLoading: false,
            error: null,
            reservedSlug: false,
          },
          ready: readyEvent,
          draft: draftStub({
            hydrateError:
              'You have already submitted an application for this event. Use Manage on the dashboard to view your application progress.',
          }) as never,
          effectivePersonId: 'p-target',
          proxyActive: true,
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('filling'));
  });

  it('uses viewing phase when submitted snapshot exists', async () => {
    fetchSubmittedMock.mockResolvedValue(
      ok({
        applicationId: 'app-1',
        responseId: 'resp-1',
        valueByFieldId: { x: 'y' },
      })
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () =>
        useFormJourney({
          entry: {
            data: readyEvent,
            isLoading: false,
            error: null,
            reservedSlug: false,
          },
          ready: readyEvent,
          draft: draftStub() as never,
          effectivePersonId: 'p1',
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('view_submitted'));
  });
});
