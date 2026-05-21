import { useEffect, useRef } from 'react';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import { computeFormRendererDefaultValues } from '@/lib/formRendererDefaultValues';

export function useFormRendererDraftSync(args: {
  form: UseFormReturn<Record<string, unknown>>;
  fieldMetas: FormFieldMeta[];
  fieldDefaults: Record<string, unknown>;
  draftValues: Record<string, unknown>;
  confirmationKeys: string[];
  readOnly: boolean;
  isDraftHydrating: boolean;
  draftHydrateError: string | null;
  scheduleSaveDraft: (dynamicValues: Record<string, unknown>) => void;
}) {
  const {
    form,
    fieldMetas,
    fieldDefaults,
    draftValues,
    confirmationKeys,
    readOnly,
    isDraftHydrating,
    draftHydrateError,
    scheduleSaveDraft,
  } = args;

  const skipDraftPersistenceRef = useRef(false);

  useEffect(() => {
    if (isDraftHydrating) return;
    skipDraftPersistenceRef.current = true;
    form.reset(
      computeFormRendererDefaultValues(fieldMetas, fieldDefaults, draftValues, confirmationKeys, readOnly)
    );
    const t = window.setTimeout(() => {
      skipDraftPersistenceRef.current = false;
    }, 0);
    return () => {
      window.clearTimeout(t);
      skipDraftPersistenceRef.current = false;
    };
  }, [isDraftHydrating, fieldMetas, fieldDefaults, draftValues, confirmationKeys, form, readOnly]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (readOnly) return;
      if (skipDraftPersistenceRef.current) return;
      if (isDraftHydrating || draftHydrateError) return;
      if (value == null || typeof value !== 'object') return;
      const w = value as Record<string, unknown>;
      const dynamic: Record<string, unknown> = {};
      for (const k of Object.keys(w)) {
        if (k === 'confirmations') continue;
        dynamic[k] = w[k];
      }
      scheduleSaveDraft(dynamic);
    });
    return () => subscription.unsubscribe();
  }, [form, scheduleSaveDraft, isDraftHydrating, draftHydrateError, readOnly]);
}
