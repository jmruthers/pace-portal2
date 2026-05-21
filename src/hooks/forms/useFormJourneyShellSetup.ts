import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { useFormFieldData } from '@/hooks/events/useFormFieldData';
import { useDraftApplication } from '@/hooks/events/useDraftApplication';
import { useFormFillTargetPerson } from '@/hooks/events/useFormFillTargetPerson';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import { useFormEntrypoint } from '@/hooks/forms/useFormEntrypoint';
import { useFormJourney } from '@/hooks/forms/useFormJourney';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

function readyToContext(ready: NonNullable<ReturnType<typeof useFormEntrypoint>['data']>) {
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

export function useFormJourneyShellSetup(entrypoint: FormEntrypoint) {
  const { isAuthenticated, user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const proxy = useProxyMode();
  const [userStartedFilling, setUserStartedFilling] = useState(false);

  const entry = useFormEntrypoint(entrypoint);
  const ready = entry.data;

  const ctxRows: CoreFormFieldRow[] = ready ? readyToContext(ready).fieldRows : [];
  const ctxEventId = ready && ready.kind === 'event' ? ready.event.event_id : null;
  const ctxFormId = ready?.form.id ?? null;

  const secureClient = toTypedSupabase(secure);
  const personQuery = useQuery({
    queryKey: [
      'formFillPersonMember',
      'v1',
      user?.id,
      organisationId,
      secureClient ? 'scoped' : 'pending',
    ],
    enabled: Boolean(isAuthenticated && user?.id && organisationId && secureClient),
    staleTime: 15_000,
    queryFn: async () => fetchCurrentPersonMember(secure, user!.id!, organisationId!),
  });

  const pm = personQuery.data;
  const selfPerson = pm && isOk(pm) ? pm.data.person : null;
  const selfMember = pm && isOk(pm) ? pm.data.member : null;

  const effectivePersonId =
    proxy.isProxyActive && proxy.targetPersonId ? proxy.targetPersonId : selfPerson?.id ?? null;

  const targetPersonQuery = useFormFillTargetPerson(proxy, effectivePersonId);

  const memberId =
    proxy.isProxyActive && proxy.targetMemberId ? proxy.targetMemberId : selfMember?.id ?? null;

  const fieldData = useFormFieldData(effectivePersonId, organisationId, ctxEventId, ctxRows);

  const draft = useDraftApplication(
    user?.id ?? null,
    effectivePersonId,
    organisationId,
    ctxEventId,
    ctxFormId,
    ctxRows
  );

  const journey = useFormJourney({
    entry,
    ready,
    draft,
    effectivePersonId,
    userStartedFilling,
  });

  const displayPerson = useMemo(() => {
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
  }, [proxy.isProxyActive, targetPersonQuery.data, selfPerson]);

  return {
    isAuthenticated,
    user,
    organisationId,
    secureClient,
    proxy,
    setUserStartedFilling,
    entry,
    ready,
    personQuery,
    pm,
    selfPerson,
    targetPersonQuery,
    effectivePersonId,
    memberId,
    fieldData,
    draft,
    journey,
    displayPerson,
  };
}
