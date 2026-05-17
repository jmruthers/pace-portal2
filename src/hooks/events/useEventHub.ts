import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { type RBACSupabaseClient, useSecureSupabase } from '@solvera/pace-core/rbac';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  type FormRowForDashboardVisibility,
  isDashboardEligibleForm,
} from '@/shared/lib/dashboardEventVisibility';
import {
  fetchCurrentPersonMember,
  NO_PERSON_PROFILE_ERROR_CODE,
} from '@/shared/lib/utils/userUtils';
import type { Database } from '@/types/pace-database';

type EventRowFull = Database['public']['Tables']['core_events']['Row'];

export type EventHubFormRow = Pick<
  Database['public']['Tables']['core_forms']['Row'],
  | 'id'
  | 'name'
  | 'title'
  | 'slug'
  | 'sort_order'
  | 'opens_at'
  | 'closes_at'
  | 'event_id'
  | 'organisation_id'
  | 'status'
  | 'is_active'
>;

/** Hub load outcome (participant PR14 contract). */
export type EventHubData = {
  event: EventRowFull;
  applicationStatus: string | null;
  eligibleFormLinks: Array<Pick<EventHubFormRow, 'slug' | 'title' | 'name' | 'sort_order'>>;
  /** True when published forms exist but none pass `isDashboardEligibleForm` at `now` */
  inactiveFormWindow: boolean;
  /** True when member has no `core_person` in selected org — hub omits personalised application badge */
  needsProfileSetup: boolean;
};

/** Shared event lookup for participant routes (PR14 hub, PR15 forms). */
export async function lookupEventRowBySlug(
  client: ReturnType<typeof toTypedSupabase>,
  slug: string,
  organisationIds: string[]
): Promise<ApiResult<EventRowFull>> {
  if (!client || organisationIds.length === 0 || !slug.trim()) {
    return err({
      code: 'EVENT_NOT_FOUND',
      message: 'Event could not be found.',
    });
  }

  const first = await client
    .from('core_events')
    .select('*')
    .eq('event_code', slug)
    .in('organisation_id', organisationIds)
    .maybeSingle();

  if (first.error) {
    return err({
      code: 'EVENT_HUB_QUERY',
      message: first.error.message?.trim() || 'Could not load event.',
    });
  }
  if (first.data) {
    return ok(first.data as EventRowFull);
  }

  if (slug !== slug.toLowerCase()) {
    const second = await client
      .from('core_events')
      .select('*')
      .eq('event_code', slug.toLowerCase())
      .in('organisation_id', organisationIds)
      .maybeSingle();
    if (second.error) {
      return err({
        code: 'EVENT_HUB_QUERY',
        message: second.error.message?.trim() || 'Could not load event.',
      });
    }
    if (second.data) {
      return ok(second.data as EventRowFull);
    }
  }

  return err({
    code: 'EVENT_NOT_FOUND',
    message: 'Event could not be found.',
  });
}

function eligibilityShape(f: EventHubFormRow): FormRowForDashboardVisibility {
  return {
    event_id: f.event_id ?? null,
    status: 'published',
    is_active: f.is_active ?? true,
    opens_at: f.opens_at ?? null,
    closes_at: f.closes_at ?? null,
  };
}

/**
 * Participant event hub orchestration for `/:eventSlug` (PR14).
 */
export async function fetchEventHub(
  secure: RBACSupabaseClient | null,
  userId: string,
  organisationId: string,
  accessibleOrganisationIds: string[],
  eventSlugRaw: string
): Promise<ApiResult<EventHubData>> {
  try {
    const client = toTypedSupabase(secure);
    const slug = eventSlugRaw?.trim() ?? '';
    const orgIds =
      accessibleOrganisationIds.length > 0 ? accessibleOrganisationIds : [organisationId];

    if (!client || !userId || !organisationId) {
      return err({
        code: 'EVENT_HUB_CONTEXT',
        message: 'Event hub requires sign-in and organisation context.',
      });
    }

    if (!slug || isReservedEventSlug(slug)) {
      return err({
        code: 'EVENT_NOT_FOUND',
        message: 'Event could not be found.',
      });
    }

    const eventLookup = await lookupEventRowBySlug(client, slug, orgIds);
    if (!isOk(eventLookup)) {
      return eventLookup;
    }
    const event = eventLookup.data;

    let needsProfileSetup = false;
    let applicationStatus: string | null = null;

    const pm = await fetchCurrentPersonMember(secure, userId, organisationId);
    if (!isOk(pm)) {
      if (pm.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
        needsProfileSetup = true;
      } else {
        return err(pm.error);
      }
    } else {
      const personId = pm.data.person.id;

      const appRes = await client
        .from('base_application')
        .select('status')
        .eq('person_id', personId)
        .eq('event_id', event.event_id)
        .maybeSingle();

      if (appRes.error) {
        return err({
          code: 'EVENT_HUB_QUERY',
          message: appRes.error.message || 'Could not load application status.',
        });
      }
      const rowStatus = appRes.data as { status: string | null } | null;
      applicationStatus =
        rowStatus?.status !== undefined &&
        typeof rowStatus.status === 'string' &&
        rowStatus.status.trim() !== ''
          ? rowStatus.status.trim()
          : null;
    }

    const formsRes = await client
      .from('core_forms')
      .select(
        'id, name, title, slug, sort_order, opens_at, closes_at, event_id, organisation_id, status, is_active'
      )
      .eq('event_id', event.event_id)
      .eq('status', 'published');

    if (formsRes.error) {
      return err({
        code: 'EVENT_HUB_QUERY',
        message: formsRes.error.message || 'Could not load event forms.',
      });
    }

    const published = (formsRes.data ?? []) as EventHubFormRow[];
    const now = new Date();

    const inactiveFormWindow =
      published.length > 0 && !published.some((f) => isDashboardEligibleForm(eligibilityShape(f), now));

    const eligibleForms = [...published].filter((f) => isDashboardEligibleForm(eligibilityShape(f), now));

    eligibleForms.sort(
      (a, b) => (Number(a.sort_order ?? 0) || 0) - (Number(b.sort_order ?? 0) || 0)
    );

    const eligibleFormLinks = eligibleForms.map((f) => ({
      slug: f.slug,
      title: f.title,
      name: f.name,
      sort_order: f.sort_order,
    }));

    return ok({
      event,
      applicationStatus,
      eligibleFormLinks,
      inactiveFormWindow,
      needsProfileSetup,
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'EVENT_HUB', 'Could not load event hub.'));
  }
}

export function useEventHub(eventSlugRaw: string | undefined) {
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

  const slug = eventSlugRaw?.trim() ?? '';
  const reserved = slug.length > 0 && isReservedEventSlug(slug);

  const query = useQuery({
    queryKey: ['eventHub', 'v1', userId, organisationId, accessibleOrganisationIds.join(','), slug],
    enabled: Boolean(client && userId && organisationId && slug && !reserved),
    staleTime: 30_000,
    queryFn: async (): Promise<ApiResult<EventHubData>> => {
      if (!userId || !organisationId || !slug) {
        return err({
          code: 'EVENT_HUB_CONTEXT',
          message: 'Event hub requires context.',
        });
      }
      return fetchEventHub(secure, userId, organisationId, accessibleOrganisationIds, slug);
    },
  });

  const apiPayload = query.data && isOk(query.data) ? query.data.data : undefined;
  const apiError =
    query.data && !isOk(query.data)
      ? query.data.error.message
      : query.error instanceof Error
        ? query.error.message
        : null;

  return {
    data: apiPayload,
    isLoading:
      Boolean(client && userId && organisationId && slug && !reserved) &&
      (query.isLoading || query.isFetching),
    errorMessage: apiError,
    rawData: query.data,
    refetch: query.refetch,
    notFound:
      slug.length > 0 &&
      query.data != null &&
      !isOk(query.data) &&
      query.data.error.code === 'EVENT_NOT_FOUND',
    reservedSlug: slug.length === 0 || reserved,
  };
}
