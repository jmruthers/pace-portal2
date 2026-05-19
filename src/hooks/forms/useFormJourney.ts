import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { UseFormEntrypointResult, FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';
import {
  fetchSubmittedRegistrationSnapshot,
  type SubmittedRegistrationSnapshot,
} from '@/lib/fetchSubmittedRegistrationSnapshot';
import type { useDraftApplication } from '@/hooks/events/useDraftApplication';

export type FormJourneyPhase = 'loading' | 'intro' | 'filling' | 'view_submitted';

function hasMeaningfulDraftValues(valueByFieldId: Record<string, unknown>): boolean {
  return Object.keys(valueByFieldId).some((k) => {
    const v = valueByFieldId[k];
    if (v === undefined || v === '') return false;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      return Object.keys(v as object).length > 0;
    }
    return true;
  });
}

export type UseFormJourneyArgs = {
  entry: Pick<UseFormEntrypointResult, 'data' | 'isLoading' | 'error' | 'reservedSlug'>;
  ready: FormJourneyReady | undefined;
  draft: ReturnType<typeof useDraftApplication>;
  effectivePersonId: string | null;
  userStartedFilling: boolean;
};

export type UseFormJourneyResult = {
  phase: FormJourneyPhase;
  submittedSnapshot: SubmittedRegistrationSnapshot | null;
};

export function useFormJourney({
  entry,
  ready,
  draft,
  effectivePersonId,
  userStartedFilling,
}: UseFormJourneyArgs): UseFormJourneyResult {
  const secure = useSecureSupabase();

  const eventScope =
    ready?.kind === 'event' ? { eventId: ready.event.event_id, formId: ready.form.id } : null;

  const submittedQuery = useQuery({
    queryKey: [
      'submittedRegistrationSnapshot',
      'v1',
      effectivePersonId,
      eventScope?.eventId ?? '',
      eventScope?.formId ?? '',
    ],
    enabled: Boolean(
      secure &&
        effectivePersonId &&
        eventScope?.eventId &&
        eventScope?.formId &&
        ready?.kind === 'event' &&
        ready.form.workflow_type === 'base_registration' &&
        !entry.isLoading &&
        ready != null
    ),
    staleTime: 15_000,
    queryFn: async () =>
      fetchSubmittedRegistrationSnapshot(
        secure,
        effectivePersonId!,
        eventScope!.eventId,
        eventScope!.formId
      ),
  });

  const submittedSnapshot =
    submittedQuery.data && isOk(submittedQuery.data) ? submittedQuery.data.data : null;

  const hasDraftRestore =
    !draft.isHydrating &&
    draft.hydrateError == null &&
    hasMeaningfulDraftValues(draft.valueByFieldId);

  const phase: FormJourneyPhase = useMemo(() => {
    if (entry.reservedSlug) {
      return 'loading';
    }
    if (entry.isLoading || !ready) {
      return 'loading';
    }

    if (
      ready.kind === 'event' &&
      ready.form.workflow_type === 'base_registration' &&
      submittedQuery.isLoading
    ) {
      return 'loading';
    }

    if (ready.kind === 'event' && submittedSnapshot != null) {
      return 'view_submitted';
    }

    if (draft.isHydrating) {
      return 'loading';
    }

    if (draft.hydrateError != null) {
      return 'filling';
    }

    if (hasDraftRestore || userStartedFilling) {
      return 'filling';
    }

    return 'intro';
  }, [
    entry.isLoading,
    entry.reservedSlug,
    ready,
    submittedQuery.isLoading,
    submittedSnapshot,
    draft.isHydrating,
    draft.hydrateError,
    hasDraftRestore,
    userStartedFilling,
  ]);

  return { phase, submittedSnapshot };
}
