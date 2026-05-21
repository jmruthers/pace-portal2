import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { err, isOk, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  ensureDraftBundle,
  persistDraftValues,
  type DraftApplicationBundle,
} from '@/lib/eventDraftPersistence';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

export type { DraftApplicationBundle } from '@/lib/eventDraftPersistence';

export function useDraftApplication(
  actingUserId: string | null,
  applicantPersonId: string | null,
  organisationId: string | null,
  eventId: string | null,
  formId: string | null,
  fieldRows: CoreFormFieldRow[]
) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const [debounceMs] = useState(600);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bundleRef = useRef<DraftApplicationBundle | null>(null);

  const stableFieldIds = fieldRows.map((r) => r.id).join(',');

  const bundleQuery = useQuery({
    queryKey: [
      'draftApplication',
      'v1',
      actingUserId,
      applicantPersonId,
      organisationId,
      eventId,
      formId,
      stableFieldIds,
    ],
    enabled: Boolean(
      client && actingUserId && applicantPersonId && organisationId && eventId && formId
    ),
    staleTime: 10_000,
    queryFn: async (): Promise<ApiResult<DraftApplicationBundle>> => {
      if (!client || !actingUserId || !applicantPersonId || !organisationId || !eventId || !formId) {
        return err({ code: 'DRAFT_CONTEXT', message: 'Draft requires full context.' });
      }
      return ensureDraftBundle(
        client,
        actingUserId,
        applicantPersonId,
        organisationId,
        eventId,
        formId
      );
    },
  });

  const bundle = bundleQuery.data && isOk(bundleQuery.data) ? bundleQuery.data.data : null;

  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const saveMutation = useMutation({
    mutationFn: async (dynamicValues: Record<string, unknown>) => {
      const rid = bundleRef.current?.responseId;
      if (!client || !organisationId || !rid) {
        throw new Error('Cannot save draft.');
      }
      const r = await persistDraftValues(client, organisationId, rid, fieldRows, dynamicValues);
      if (!isOk(r)) {
        throw new Error(r.error.message);
      }
    },
  });

  const scheduleSaveDraft = useCallback(
    (dynamicValues: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveMutation.mutate(dynamicValues);
      }, debounceMs);
    },
    [debounceMs, saveMutation]
  );

  const saveDraftNow = useCallback(
    async (dynamicValues: Record<string, unknown>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      await saveMutation.mutateAsync(dynamicValues);
    },
    [saveMutation]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const hydrateError =
    bundleQuery.data != null && !isOk(bundleQuery.data) ? bundleQuery.data.error.message : null;

  const saveDraftError =
    saveMutation.isError && saveMutation.error instanceof Error
      ? saveMutation.error.message
      : saveMutation.isError
        ? 'Draft save failed.'
        : null;

  return {
    applicationId: bundle?.applicationId ?? null,
    responseId: bundle?.responseId ?? null,
    valueByFieldId: bundle?.valueByFieldId ?? {},
    isHydrating: bundleQuery.isLoading,
    hydrateError,
    saveDraftNow,
    scheduleSaveDraft,
    isSavingDraft: saveMutation.isPending,
    saveDraftError,
    refetchBundle: bundleQuery.refetch,
  };
}
