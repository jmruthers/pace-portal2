import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { computeProfileProgress, type ProfileProgressResult } from '@/shared/lib/profileProgress';
import {
  fetchCurrentPersonMember,
  NO_PERSON_PROFILE_ERROR_CODE,
} from '@/shared/lib/utils/userUtils';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { toTypedSupabase, toSupabaseClientLike } from '@/lib/supabase-typed';
import { distinctEligibleEventIds } from '@/shared/lib/dashboardEventVisibility';
import {
  resolveDashboardEventLogoUrls,
  type EventLogoRefRow,
} from '@/shared/lib/eventDashboardLogos';
/** Re-export for modules that imported this constant from `useEnhancedLanding`. */
export { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

type MediRow = Database['public']['Tables']['medi_profile']['Row'] | null;
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];
type EventRow = Database['public']['Tables']['core_events']['Row'];

/**
 * Event row plus optional resolved logo URL for the dashboard card (`core_file_references` for
 * `core_events` + storage public/signed URL). pace-core `data_user_events_get.event_logo` also
 * returns a storage path for RPC consumers.
 */
export type DashboardEvent = EventRow & { event_logo?: string | null };

/** Groups organisation events by `registration_scope` for dashboard sections (testable). */
export function groupEventsByRegistrationScope(
  events: DashboardEvent[]
): Record<string, DashboardEvent[]> {
  const eventsByCategory: Record<string, DashboardEvent[]> = {};
  for (const ev of events) {
    const cat = ev.registration_scope || 'default';
    if (!eventsByCategory[cat]) eventsByCategory[cat] = [];
    eventsByCategory[cat].push(ev);
  }
  return eventsByCategory;
}

export type AdditionalContactRow = {
  contact_id: string;
  contact_person_id: string;
  contact_type_id: number;
  contact_type_name: string;
  email: string;
  first_name: string;
  last_name: string;
  member_id: string;
  organisation_id: string;
  permission_type: string;
  phone_number: string;
  phone_type: string;
};

export type EnhancedLandingModel = {
  person: Database['public']['Tables']['core_person']['Row'] | null;
  member: Database['public']['Tables']['core_member']['Row'] | null;
  mediProfile: MediRow;
  phones: PhoneRow[];
  additionalContacts: AdditionalContactRow[];
  /** Events grouped by `registration_scope` as category buckets. */
  eventsByCategory: Record<string, DashboardEvent[]>;
  profileProgress: ProfileProgressResult;
  /** True when no `core_person` row exists for the user in org context (dashboard setup prompt). */
  needsProfileSetup: boolean;
};

export function createEmptyEnhancedLandingModel(needsProfileSetup: boolean): EnhancedLandingModel {
  return {
    person: null,
    member: null,
    mediProfile: null,
    phones: [],
    additionalContacts: [],
    eventsByCategory: {},
    profileProgress: computeProfileProgress({ person: null, member: null }),
    needsProfileSetup,
  };
}

/**
 * Loads dashboard landing aggregate (profile, phones, medical, contacts, events). Exported for tests and direct orchestration; TanStack consumers should use {@link useEnhancedLanding}.
 * @param accessibleOrganisationIds Organisations the user may access; events are listed for all of these (not only the selected org).
 */
export async function fetchEnhancedLanding(
  secure: RBACSupabaseClient | null,
  userId: string,
  organisationId: string,
  accessibleOrganisationIds: string[]
): Promise<ApiResult<EnhancedLandingModel>> {
  try {
    const client = toTypedSupabase(secure);
    if (!client || !userId || !organisationId) {
      return err({
        code: 'ENHANCED_LANDING_CONTEXT',
        message: 'Landing data requires organisation context.',
      });
    }

    const pm = await fetchCurrentPersonMember(secure, userId, organisationId);
    if (!isOk(pm)) {
      if (pm.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
        return ok(createEmptyEnhancedLandingModel(true));
      }
      return err(pm.error);
    }

    const { person, member } = pm.data;
    const personId = person.id;

    const eventOrgIds =
      accessibleOrganisationIds.length > 0 ? accessibleOrganisationIds : [organisationId];

    const [medi, phones, contacts, forms] = await Promise.all([
      client.from('medi_profile').select('*').eq('person_id', personId).maybeSingle(),
      client.from('core_phone').select('*').eq('person_id', personId).is('deleted_at', null),
      client.rpc('data_pace_contacts_list', { p_user_id: userId }),
      client
        .from('core_forms')
        .select('event_id, status, is_active, opens_at, closes_at')
        .in('organisation_id', eventOrgIds)
        .eq('status', 'published'),
    ]);

    const firstError = medi.error ?? phones.error ?? contacts.error ?? forms.error;
    if (firstError) {
      return err({
        code: 'ENHANCED_LANDING_QUERY',
        message: firstError.message || 'Could not load dashboard data.',
      });
    }

    const contactRows = (contacts.data ?? []) as AdditionalContactRow[];

    const eligibleEventIds = distinctEligibleEventIds(forms.data ?? [], new Date());

    const events =
      eligibleEventIds.length === 0
        ? { data: [] as EventRow[], error: null }
        : await client
            .from('core_events')
            .select('*')
            .in('event_id', eligibleEventIds)
            .in('organisation_id', eventOrgIds)
            .order('event_date', { ascending: true });

    if (events.error) {
      return err({
        code: 'ENHANCED_LANDING_QUERY',
        message: events.error.message || 'Could not load dashboard data.',
      });
    }

    const eventList = (events.data ?? []) as EventRow[];
    const eventIds = eventList.map((e) => e.event_id);

    let logoUrlByEventId = new Map<string, string>();
    if (eventIds.length > 0) {
      const refsRes = await client
        .from('core_file_references')
        .select('record_id, file_path, is_public, file_metadata, created_at')
        .eq('table_name', 'core_events')
        .in('record_id', eventIds);

      if (refsRes.error) {
        return err({
          code: 'ENHANCED_LANDING_QUERY',
          message: refsRes.error.message || 'Could not load dashboard data.',
        });
      }

      const storageClient = toSupabaseClientLike(secure) as Parameters<
        typeof resolveDashboardEventLogoUrls
      >[0];
      logoUrlByEventId = await resolveDashboardEventLogoUrls(
        storageClient,
        (refsRes.data ?? []) as EventLogoRefRow[]
      );
    }

    const eventRows: DashboardEvent[] = eventList.map((e) => ({
      ...e,
      event_logo: logoUrlByEventId.get(e.event_id) ?? null,
    }));
    const eventsByCategory = groupEventsByRegistrationScope(eventRows);

    const progress = computeProfileProgress({
      person: {
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        date_of_birth: person.date_of_birth,
        preferred_name: person.preferred_name,
        gender_id: person.gender_id,
        pronoun_id: person.pronoun_id,
      },
      member: member
        ? {
            membership_type_id: member.membership_type_id,
            membership_number: member.membership_number,
          }
        : null,
    });

    return ok({
      person,
      member,
      mediProfile: medi.data,
      phones: phones.data ?? [],
      additionalContacts: contactRows,
      eventsByCategory,
      profileProgress: progress,
      needsProfileSetup: false,
    });
  } catch (e) {
    return err(
      normalizeToApiError(e, 'ENHANCED_LANDING', 'Could not load dashboard data.')
    );
  }
}

/**
 * Aggregates dashboard landing data: profile, phones, medical profile, contacts, and organisation events.
 */
export function useEnhancedLanding() {
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

  const query = useQuery({
    queryKey: ['enhancedLanding', 'v3', userId, organisationId, accessibleOrganisationIds.join(',')],
    enabled: Boolean(client && userId && organisationId),
    staleTime: 60_000,
    queryFn: async (): Promise<ApiResult<EnhancedLandingModel>> => {
      if (!userId || !organisationId) {
        return err({
          code: 'ENHANCED_LANDING_CONTEXT',
          message: 'Landing data requires organisation context.',
        });
      }
      return fetchEnhancedLanding(secure, userId, organisationId, accessibleOrganisationIds);
    },
  });

  const apiError = query.data && !isOk(query.data) ? query.data.error : null;
  return {
    ...query,
    data: query.data && isOk(query.data) ? query.data.data : undefined,
    error: apiError
      ? new Error(apiError.message)
      : query.error instanceof Error
        ? query.error
        : null,
    isError: Boolean(apiError) || query.isError,
    isSuccess: query.isSuccess && !apiError,
  };
}
