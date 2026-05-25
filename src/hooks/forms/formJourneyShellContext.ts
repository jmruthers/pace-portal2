import type { useFormEntrypoint } from '@/hooks/forms/useFormEntrypoint';
import type { useProxyMode } from '@/shared/hooks/useProxyMode';
import type { useFormFillTargetPerson } from '@/hooks/events/useFormFillTargetPerson';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import { resolveEventFormWriteOrganisationId } from '@/lib/eventFormWriteContext';

type FormJourneyReady = NonNullable<ReturnType<typeof useFormEntrypoint>['data']>;

export function readyToFormJourneyContext(ready: FormJourneyReady) {
  if (ready.kind === 'event') {
    return {
      eventTitle: ready.event.event_name,
      eventId: ready.event.event_id,
      form: ready.form,
      fieldRows: ready.fieldRows,
      confirmationKeys: ready.confirmationKeys,
    };
  }
  return {
    eventTitle: ready.shellTitle,
    eventId: null as string | null,
    form: ready.form,
    fieldRows: ready.fieldRows,
    confirmationKeys: ready.confirmationKeys,
  };
}

type SelfPerson = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
} | null;

export function resolveFormJourneyDisplayPerson(args: {
  proxy: ReturnType<typeof useProxyMode>;
  targetPersonQuery: ReturnType<typeof useFormFillTargetPerson>;
  selfPerson: SelfPerson;
}): SelfPerson {
  const { proxy, targetPersonQuery, selfPerson } = args;
  if (proxy.isProxyActive && targetPersonQuery.data) {
    return targetPersonQuery.data;
  }
  if (selfPerson) {
    return {
      first_name: selfPerson.first_name,
      last_name: selfPerson.last_name,
      email: selfPerson.email,
    };
  }
  return null;
}

export function resolveFormJourneyFieldContext(
  ready: FormJourneyReady | undefined,
  organisationId: string | null
) {
  const journeyContext = ready ? readyToFormJourneyContext(ready) : null;
  const ctxRows: CoreFormFieldRow[] = journeyContext?.fieldRows ?? [];
  const ctxEventId = ready && ready.kind === 'event' ? ready.event.event_id : null;
  const ctxFormId = ready?.form.id ?? null;
  const eventWriteOrganisationId =
    ready?.kind === 'event'
      ? resolveEventFormWriteOrganisationId(ready.event.organisation_id)
      : null;
  const writeOrganisationId = eventWriteOrganisationId ?? organisationId;

  return { ctxRows, ctxEventId, ctxFormId, writeOrganisationId };
}

export function resolveEffectivePersonId(
  proxy: ReturnType<typeof useProxyMode>,
  selfPersonId: string | null | undefined
): string | null {
  if (proxy.isProxyActive && proxy.targetPersonId) {
    return proxy.targetPersonId;
  }
  return selfPersonId ?? null;
}

export function resolveFormJourneyMemberId(
  proxy: ReturnType<typeof useProxyMode>,
  selfMemberId: string | null | undefined
): string | null {
  if (proxy.isProxyActive && proxy.targetMemberId) {
    return proxy.targetMemberId;
  }
  return selfMemberId ?? null;
}
