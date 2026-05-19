import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { err, isOk, type ApiResult } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { FormBySlugReady } from '@/hooks/events/useFormBySlug';
import { useFormBySlug } from '@/hooks/events/useFormBySlug';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import { fetchOrgFormBySlug, type OrgFormBySlugReady } from '@/lib/fetchOrgFormBySlug';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type FormJourneyReady =
  | ({ kind: 'event' } & FormBySlugReady)
  | ({ kind: 'org'; shellTitle: string } & OrgFormBySlugReady);

export type UseFormEntrypointResult = {
  data: FormJourneyReady | undefined;
  isLoading: boolean;
  error: { code?: string; message?: string } | null;
  notFound: boolean;
  reservedSlug: boolean;
  /** Event slug when `kind === 'event'`; used for profile-complete handoff and back navigation. */
  routeEventSlug: string | null;
  /** Explicit form slug for `event_form`, else null (primary entrypoint or org). */
  routeFormSlug: string | null;
};

/* eslint-disable complexity -- PR17 entrypoint switch: event vs org load paths share one hook surface. */
export function useFormEntrypoint(entrypoint: FormEntrypoint): UseFormEntrypointResult {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const accessibleOrganisationIds = useMemo(
    () => (org?.organisations ?? []).map((o) => o.id).filter(Boolean),
    [org?.organisations]
  );

  const shellTitle =
    org?.selectedOrganisation?.name != null && org.selectedOrganisation.name.trim() !== ''
      ? org.selectedOrganisation.name.trim()
      : 'Organisation';

  const isOrg = entrypoint.kind === 'org_form';
  const orgFormSlug = isOrg ? entrypoint.formSlug.trim() : '';

  const eventSlugForLoad =
    !isOrg && entrypoint.kind === 'event_application'
      ? entrypoint.eventSlug
      : !isOrg && entrypoint.kind === 'event_form'
        ? entrypoint.eventSlug
        : undefined;

  const eventExplicitSlug: string | null =
    !isOrg && entrypoint.kind === 'event_form' ? entrypoint.formSlug : null;

  const eventLoad = useFormBySlug(eventSlugForLoad, isOrg ? null : eventExplicitSlug);

  const orgQuery = useQuery({
    queryKey: [
      'orgFormBySlug',
      'v1',
      userId,
      organisationId,
      accessibleOrganisationIds.join(','),
      orgFormSlug,
    ],
    enabled: Boolean(
      client && userId && organisationId && isOrg && orgFormSlug !== ''
    ),
    staleTime: 30_000,
    queryFn: async (): Promise<ApiResult<OrgFormBySlugReady>> => {
      if (!userId || !organisationId || !orgFormSlug) {
        return err({ code: 'FORM_LOAD_CONTEXT', message: 'Form load requires context.' });
      }
      return fetchOrgFormBySlug(secure, organisationId, accessibleOrganisationIds, orgFormSlug);
    },
  });

  if (isOrg) {
    const payload =
      orgQuery.data && isOk(orgQuery.data) ? orgQuery.data.data : undefined;
    const apiError =
      orgQuery.data && !isOk(orgQuery.data)
        ? orgQuery.data.error
        : orgQuery.error instanceof Error
          ? { code: 'FORM_LOAD_QUERY', message: orgQuery.error.message }
          : null;

    return {
      data:
        payload != null
          ? {
              kind: 'org',
              shellTitle,
              ...payload,
            }
          : undefined,
      isLoading: Boolean(client && userId && organisationId && isOrg && orgFormSlug !== '') && orgQuery.isLoading,
      error: apiError,
      notFound: apiError?.code === 'FORM_NOT_FOUND',
      reservedSlug: false,
      routeEventSlug: null,
      routeFormSlug: orgFormSlug !== '' ? orgFormSlug : null,
    };
  }

  const evData = eventLoad.data;
  return {
    data: evData ? { kind: 'event', ...evData } : undefined,
    isLoading: eventLoad.isLoading,
    error: eventLoad.error,
    notFound: eventLoad.notFound,
    reservedSlug: eventLoad.reservedSlug,
    routeEventSlug:
      entrypoint.kind === 'event_application' || entrypoint.kind === 'event_form'
        ? entrypoint.eventSlug
        : null,
    routeFormSlug: entrypoint.kind === 'event_form' ? entrypoint.formSlug : null,
  };
}
/* eslint-enable complexity */
