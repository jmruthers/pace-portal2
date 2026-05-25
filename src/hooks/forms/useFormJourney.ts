import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { UseFormEntrypointResult, FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';
import {
  fetchSubmittedRegistrationSnapshot,
  type SubmittedRegistrationSnapshot,
} from '@/lib/fetchSubmittedRegistrationSnapshot';
import { isAlreadySubmittedParticipantMessage } from '@/lib/participantAlreadySubmittedMessage';
import type { useDraftApplication } from '@/hooks/events/useDraftApplication';

export type FormJourneyPhase = 'loading' | 'filling' | 'view_submitted';

export type UseFormJourneyArgs = {
  entry: Pick<UseFormEntrypointResult, 'data' | 'isLoading' | 'error' | 'reservedSlug'>;
  ready: FormJourneyReady | undefined;
  draft: ReturnType<typeof useDraftApplication>;
  effectivePersonId: string | null;
  /** When true, only the target person's submitted snapshot may enter read-only (not acting-user draft errors). */
  proxyActive?: boolean;
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
  proxyActive = false,
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

    if (
      !proxyActive &&
      ready.kind === 'event' &&
      ready.form.workflow_type === 'base_registration' &&
      isAlreadySubmittedParticipantMessage(draft.hydrateError)
    ) {
      return 'view_submitted';
    }

    if (draft.isHydrating) {
      return 'loading';
    }

    return 'filling';
  }, [
    entry.isLoading,
    entry.reservedSlug,
    ready,
    submittedQuery.isLoading,
    submittedSnapshot,
    draft.hydrateError,
    draft.isHydrating,
    proxyActive,
  ]);

  return { phase, submittedSnapshot };
}
