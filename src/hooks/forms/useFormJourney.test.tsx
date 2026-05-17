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

  it('starts at intro when there is no draft, no submitted record, and user has not started', async () => {
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
          userStartedFilling: false,
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('intro'));
  });

  it('moves to filling when the user has started from intro', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    const { result, rerender } = renderHook(
      (props: { started: boolean }) =>
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
          userStartedFilling: props.started,
        }),
      { wrapper, initialProps: { started: false } }
    );
    await waitFor(() => expect(result.current.phase).toBe('intro'));
    rerender({ started: true });
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
          userStartedFilling: false,
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.phase).toBe('view_submitted'));
  });
});
