import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@solvera/pace-core/types';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

const ensureDraftBundleMock = vi.hoisted(() => vi.fn());
const persistDraftValuesMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/eventDraftPersistence', () => ({
  ensureDraftBundle: (...args: unknown[]) => ensureDraftBundleMock(...args),
  persistDraftValues: (...args: unknown[]) => persistDraftValuesMock(...args),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

import { useDraftApplication } from '@/hooks/events/useDraftApplication';

function fieldRow(id: string): CoreFormFieldRow {
  return {
    id,
    form_id: 'form-1',
    organisation_id: 'o1',
    field_key: 'person.first_name',
    field_label: 'First',
    sort_order: 1,
    is_active: true,
    is_required: true,
    display_options: null,
    validation_rules: null,
    created_at: null,
    updated_at: null,
  } as CoreFormFieldRow;
}

describe('useDraftApplication hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureDraftBundleMock.mockResolvedValue(
      ok({
        applicationId: null,
        responseId: 'resp-1',
        writeOrganisationId: 'org-event',
        valueByFieldId: { 'field-1': 'saved' },
      })
    );
    persistDraftValuesMock.mockResolvedValue(ok(null));
  });

  it('loads draft bundle when context is complete', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
      { wrapper }
    );

    await waitFor(() => expect(result.current.responseId).toBe('resp-1'));
    expect(result.current.valueByFieldId['field-1']).toBe('saved');
    expect(ensureDraftBundleMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'ev1', 'form-1');
  });

  it('saveDraftNow persists values against the loaded bundle', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
      { wrapper }
    );

    await waitFor(() => expect(result.current.responseId).toBe('resp-1'));
    await result.current.saveDraftNow({ 'field-1': 'next' });

    expect(persistDraftValuesMock).toHaveBeenCalledWith(
      expect.anything(),
      'org-event',
      'resp-1',
      [fieldRow('field-1')],
      { 'field-1': 'next' }
    );
  });

  it('surfaces hydrate error when draft ensure fails', async () => {
    ensureDraftBundleMock.mockResolvedValue(
      err({ code: 'DRAFT_CONTEXT', message: 'Cannot load draft.' })
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
      { wrapper }
    );

    await waitFor(() => expect(result.current.hydrateError).toBe('Cannot load draft.'));
  });

  it('surfaces saveDraftError when persist fails', async () => {
    persistDraftValuesMock.mockResolvedValue(err({ code: 'X', message: 'Persist failed' }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
      { wrapper }
    );

    await waitFor(() => expect(result.current.responseId).toBe('resp-1'));
    await expect(result.current.saveDraftNow({ 'field-1': 'bad' })).rejects.toThrow('Persist failed');
    await waitFor(() => expect(result.current.saveDraftError).toBe('Persist failed'));
  });

  it('saveDraftNow throws when draft bundle is not loaded', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useDraftApplication('u1', 'p1', 'o1', null, 'form-1', [fieldRow('field-1')]),
      { wrapper }
    );

    await expect(result.current.saveDraftNow({ 'field-1': 'x' })).rejects.toThrow('Cannot save draft.');
  });

  it('scheduleSaveDraft debounces persist calls', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
        { wrapper }
      );

      await waitFor(() => expect(result.current.responseId).toBe('resp-1'));

      await act(async () => {
        result.current.scheduleSaveDraft({ 'field-1': 'debounced' });
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(persistDraftValuesMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('scheduleSaveDraft clears a pending timer when rescheduled', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
        { wrapper }
      );

      await waitFor(() => expect(result.current.responseId).toBe('resp-1'));

      await act(async () => {
        result.current.scheduleSaveDraft({ 'field-1': 'first' });
        result.current.scheduleSaveDraft({ 'field-1': 'second' });
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(persistDraftValuesMock).toHaveBeenCalledTimes(1);
      expect(persistDraftValuesMock).toHaveBeenCalledWith(
        expect.anything(),
        'org-event',
        'resp-1',
        [fieldRow('field-1')],
        { 'field-1': 'second' }
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('saveDraftNow clears a pending scheduled save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () => useDraftApplication('u1', 'p1', 'o1', 'ev1', 'form-1', [fieldRow('field-1')]),
        { wrapper }
      );

      await waitFor(() => expect(result.current.responseId).toBe('resp-1'));

      await act(async () => {
        result.current.scheduleSaveDraft({ 'field-1': 'scheduled' });
      });
      await act(async () => {
        await result.current.saveDraftNow({ 'field-1': 'immediate' });
      });

      expect(persistDraftValuesMock).toHaveBeenCalledTimes(1);
      expect(persistDraftValuesMock).toHaveBeenCalledWith(
        expect.anything(),
        'org-event',
        'resp-1',
        [fieldRow('field-1')],
        { 'field-1': 'immediate' }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(persistDraftValuesMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
