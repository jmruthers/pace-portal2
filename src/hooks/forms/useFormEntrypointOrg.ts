import type { UseQueryResult } from '@tanstack/react-query';
import { isOk, type ApiResult } from '@solvera/pace-core/types';
import type { OrgFormBySlugReady } from '@/lib/fetchOrgFormBySlug';
import type { FormJourneyReady, UseFormEntrypointResult } from '@/hooks/forms/useFormEntrypoint';

export function buildOrgFormEntrypointResult(args: {
  orgQuery: UseQueryResult<ApiResult<OrgFormBySlugReady>, Error>;
  shellTitle: string;
  orgFormSlug: string;
  clientReady: boolean;
  userId: string | null;
  organisationId: string | null;
}): UseFormEntrypointResult {
  const { orgQuery, shellTitle, orgFormSlug, clientReady, userId, organisationId } = args;
  const payload = orgQuery.data && isOk(orgQuery.data) ? orgQuery.data.data : undefined;
  const apiError =
    orgQuery.data && !isOk(orgQuery.data)
      ? orgQuery.data.error
      : orgQuery.error instanceof Error
        ? { code: 'FORM_LOAD_QUERY', message: orgQuery.error.message }
        : null;

  return {
    data:
      payload != null
        ? ({
            kind: 'org',
            shellTitle,
            ...payload,
          } satisfies FormJourneyReady)
        : undefined,
    isLoading: Boolean(clientReady && userId && organisationId && orgFormSlug !== '') && orgQuery.isLoading,
    error: apiError,
    notFound: apiError?.code === 'FORM_NOT_FOUND',
    reservedSlug: false,
    routeEventSlug: null,
    routeFormSlug: orgFormSlug !== '' ? orgFormSlug : null,
  };
}
