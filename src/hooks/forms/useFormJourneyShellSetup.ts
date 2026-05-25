import { useMemo } from 'react';
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
import {
  resolveEffectivePersonId,
  resolveFormJourneyDisplayPerson,
  resolveFormJourneyFieldContext,
  resolveFormJourneyMemberId,
} from '@/hooks/forms/formJourneyShellContext';

export function useFormJourneyShellSetup(entrypoint: FormEntrypoint) {
  const { isAuthenticated, user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const proxy = useProxyMode();
  const entry = useFormEntrypoint(entrypoint);
  const ready = entry.data;

  const { ctxRows, ctxEventId, ctxFormId, writeOrganisationId } = resolveFormJourneyFieldContext(
    ready,
    organisationId
  );

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

  const effectivePersonId = resolveEffectivePersonId(proxy, selfPerson?.id);
  const targetPersonQuery = useFormFillTargetPerson(proxy, effectivePersonId);
  const memberId = resolveFormJourneyMemberId(proxy, selfMember?.id);

  const fieldData = useFormFieldData(effectivePersonId, organisationId, ctxEventId, ctxRows);

  const draft = useDraftApplication(
    user?.id ?? null,
    effectivePersonId,
    writeOrganisationId,
    ctxEventId,
    ctxFormId,
    ctxRows
  );

  const journey = useFormJourney({
    entry,
    ready,
    draft,
    effectivePersonId,
    proxyActive: proxy.isProxyActive,
  });

  const displayPerson = useMemo(
    () =>
      resolveFormJourneyDisplayPerson({
        proxy,
        targetPersonQuery,
        selfPerson,
      }),
    [proxy, targetPersonQuery, selfPerson]
  );

  return {
    isAuthenticated,
    user,
    organisationId,
    writeOrganisationId,
    secureClient,
    proxy,
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
