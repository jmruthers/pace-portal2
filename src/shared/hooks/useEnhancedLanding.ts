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
import { toTypedSupabase } from '@/lib/supabase-typed';

/** Re-export for modules that imported this constant from `useEnhancedLanding`. */
export { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';

type MediRow = Database['public']['Tables']['medi_profile']['Row'] | null;
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];
type EventRow = Database['public']['Tables']['core_events']['Row'];

/** Groups organisation events by `registration_scope` for dashboard sections (testable). */
export function groupEventsByRegistrationScope(events: EventRow[]): Record<string, EventRow[]> {
  const eventsByCategory: Record<string, EventRow[]> = {};
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
  eventsByCategory: Record<string, EventRow[]>;
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
 */
export async function fetchEnhancedLanding(
  secure: RBACSupabaseClient | null,
  userId: string,
  organisationId: string
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

    const [medi, phones, contacts, events] = await Promise.all([
      client.from('medi_profile').select('*').eq('person_id', personId).maybeSingle(),
      client.from('core_phone').select('*').eq('person_id', personId).is('deleted_at', null),
      client.rpc('data_pace_contacts_list', { p_user_id: userId }),
      client.from('core_events').select('*').eq('organisation_id', organisationId).order('event_date', { ascending: true }),
    ]);

    const firstError = medi.error ?? phones.error ?? contacts.error ?? events.error;
    if (firstError) {
      return err({
        code: 'ENHANCED_LANDING_QUERY',
        message: firstError.message || 'Could not load dashboard data.',
      });
    }

    const contactRows = (contacts.data ?? []) as AdditionalContactRow[];

    const eventRows = events.data ?? [];
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

  return useQuery({
    queryKey: ['enhancedLanding', 'v1', userId, organisationId],
    enabled: Boolean(client && userId && organisationId),
    staleTime: 60_000,
    queryFn: async (): Promise<EnhancedLandingModel> => {
      if (!userId || !organisationId) {
        throw new Error('Landing data requires organisation context.');
      }
      const result = await fetchEnhancedLanding(secure, userId, organisationId);
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
