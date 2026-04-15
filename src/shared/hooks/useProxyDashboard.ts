import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { computeProfileProgress, type ProfileProgressResult } from '@/shared/lib/profileProgress';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { AdditionalContactRow, EnhancedLandingModel } from '@/shared/hooks/useEnhancedLanding';
import { groupEventsByRegistrationScope } from '@/shared/hooks/useEnhancedLanding';

type MediRow = Database['public']['Tables']['medi_profile']['Row'] | null;
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];
type EventRow = Database['public']['Tables']['core_events']['Row'];

/**
 * Loads dashboard-equivalent data for a delegated target member (PR08). Access must already be validated (e.g. {@link useProxyMode}).
 */
export async function fetchDelegatedWorkspace(
  secure: RBACSupabaseClient | null,
  organisationId: string,
  targetMemberId: string,
  targetPersonId: string
): Promise<ApiResult<EnhancedLandingModel>> {
  try {
    const client = toTypedSupabase(secure);
    if (!client) {
      return err({ code: 'PROXY_DASHBOARD_CONTEXT', message: 'Client is not available.' });
    }

    const [memberRes, personRes] = await Promise.all([
      client
        .from('core_member')
        .select('*')
        .eq('id', targetMemberId)
        .eq('organisation_id', organisationId)
        .maybeSingle(),
      client.from('core_person').select('*').eq('id', targetPersonId).maybeSingle(),
    ]);

    const firstErr = memberRes.error ?? personRes.error;
    if (firstErr) {
      return err({
        code: 'PROXY_DASHBOARD_LOAD',
        message: firstErr.message || 'Could not load delegated member.',
      });
    }

    const member = memberRes.data;
    const person = personRes.data;

    if (!member || !person || member.person_id !== targetPersonId) {
      return err({
        code: 'PROXY_DASHBOARD_MEMBER',
        message: 'Delegated member could not be loaded.',
      });
    }

    const personId = person.id;

    const [medi, phones, memberContacts, events] = await Promise.all([
      client.from('medi_profile').select('*').eq('person_id', personId).maybeSingle(),
      client.from('core_phone').select('*').eq('person_id', personId).is('deleted_at', null),
      client.rpc('data_pace_member_contacts_list', { p_member_id: targetMemberId }),
      client
        .from('core_events')
        .select('*')
        .eq('organisation_id', organisationId)
        .order('event_date', { ascending: true }),
    ]);

    const batchErr = medi.error ?? phones.error ?? memberContacts.error ?? events.error;
    if (batchErr) {
      return err({
        code: 'PROXY_DASHBOARD_QUERY',
        message: batchErr.message || 'Could not load delegated workspace data.',
      });
    }

    const contactRows = (memberContacts.data ?? []) as AdditionalContactRow[];
    const eventRows = (events.data ?? []) as EventRow[];
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
      member: {
        membership_type_id: member.membership_type_id,
        membership_number: member.membership_number,
      },
    });

    return ok({
      person,
      member,
      mediProfile: medi.data as MediRow,
      phones: (phones.data ?? []) as PhoneRow[],
      additionalContacts: contactRows,
      eventsByCategory,
      profileProgress: progress as ProfileProgressResult,
      needsProfileSetup: false,
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'PROXY_DASHBOARD', 'Could not load delegated workspace.'));
  }
}

export type UseProxyDashboardParams = {
  /** Pass through from {@link useProxyMode} in the same component — do not call `useProxyMode` inside this hook. */
  isProxyActive: boolean;
  targetMemberId: string | null;
  targetPersonId: string | null;
};

/**
 * Dashboard-style aggregate for the validated proxy target (PR08). Billing surfaces excluded by composition.
 * Call {@link useProxyMode} once in the parent and pass flags/ids here so proxy state is not duplicated.
 */
export function useProxyDashboard(params: UseProxyDashboardParams) {
  const { isProxyActive, targetMemberId, targetPersonId } = params;
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;

  return useQuery({
    queryKey: ['proxyDashboard', 'v1', userId, organisationId, targetMemberId, targetPersonId],
    enabled: Boolean(
      client && userId && organisationId && isProxyActive && targetMemberId && targetPersonId
    ),
    staleTime: 60_000,
    queryFn: async (): Promise<EnhancedLandingModel> => {
      if (!userId || !organisationId || !targetMemberId || !targetPersonId) {
        throw new Error('Delegated workspace requires organisation and validated proxy context.');
      }
      const result = await fetchDelegatedWorkspace(
        secure,
        organisationId,
        targetMemberId,
        targetPersonId
      );
      if (!isOk(result)) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
