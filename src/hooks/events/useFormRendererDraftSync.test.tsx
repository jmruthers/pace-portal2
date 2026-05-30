import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import { useFormRendererDraftSync } from '@/hooks/events/useFormRendererDraftSync';

vi.mock('@/lib/formRendererDefaultValues', () => ({
  computeFormRendererDefaultValues: vi.fn(
    (
      _metas: FormFieldMeta[],
      _defaults: Record<string, unknown>,
      draft: Record<string, unknown>
    ) => ({ ...draft, confirmations: {} })
  ),
}));

describe('useFormRendererDraftSync (PR17 draft hydrate + autosave)', () => {
  let watchCallback: ((value: Record<string, unknown>) => void) | undefined;
  const reset = vi.fn();
  const scheduleSaveDraft = vi.fn();

  function buildForm(): UseFormReturn<Record<string, unknown>> {
    return {
      reset,
      watch: vi.fn((cb?: (value: Record<string, unknown>) => void) => {
        if (typeof cb === 'function') {
          watchCallback = cb;
        }
        return { unsubscribe: vi.fn() };
      }),
    } as unknown as UseFormReturn<Record<string, unknown>>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    watchCallback = undefined;
  });

  it('resets form when draft hydration completes', () => {
    const form = buildForm();
    const { rerender } = renderHook(
      ({ hydrating }: { hydrating: boolean }) =>
        useFormRendererDraftSync({
          form,
          fieldMetas: [],
          fieldDefaults: {},
          draftValues: { q1: 'draft' },
          confirmationKeys: [],
          readOnly: false,
          isDraftHydrating: hydrating,
          draftHydrateError: null,
          scheduleSaveDraft,
        }),
      { initialProps: { hydrating: true } }
    );

    expect(reset).not.toHaveBeenCalled();
    rerender({ hydrating: false });
    expect(reset).toHaveBeenCalledWith({ q1: 'draft', confirmations: {} });
  });

  it('schedules save on watch when not read-only and no hydrate error', () => {
    vi.useFakeTimers();
    const form = buildForm();
    renderHook(() =>
      useFormRendererDraftSync({
        form,
        fieldMetas: [],
        fieldDefaults: {},
        draftValues: {},
        confirmationKeys: [],
        readOnly: false,
        isDraftHydrating: false,
        draftHydrateError: null,
        scheduleSaveDraft,
      })
    );

    vi.runAllTimers();
    expect(watchCallback).toBeDefined();
    watchCallback?.({ q1: 'a', confirmations: { c1: true } });
    expect(scheduleSaveDraft).toHaveBeenCalledWith({ q1: 'a' });
    vi.useRealTimers();
  });

  it('does not schedule save when readOnly', () => {
    const form = buildForm();
    renderHook(() =>
      useFormRendererDraftSync({
        form,
        fieldMetas: [],
        fieldDefaults: {},
        draftValues: {},
        confirmationKeys: [],
        readOnly: true,
        isDraftHydrating: false,
        draftHydrateError: null,
        scheduleSaveDraft,
      })
    );

    watchCallback?.({ q1: 'a' });
    expect(scheduleSaveDraft).not.toHaveBeenCalled();
  });

  it('does not schedule save when draftHydrateError is set', () => {
    const form = buildForm();
    renderHook(() =>
      useFormRendererDraftSync({
        form,
        fieldMetas: [],
        fieldDefaults: {},
        draftValues: {},
        confirmationKeys: [],
        readOnly: false,
        isDraftHydrating: false,
        draftHydrateError: 'load failed',
        scheduleSaveDraft,
      })
    );

    watchCallback?.({ q1: 'a' });
    expect(scheduleSaveDraft).not.toHaveBeenCalled();
  });
});
