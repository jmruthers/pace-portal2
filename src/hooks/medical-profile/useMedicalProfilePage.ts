import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { useMemberProfileData } from '@/hooks/member-profile/useMemberProfileData';
import { fetchMedicalProfileData, useMedicalProfileData } from '@/hooks/medical-profile/useMedicalProfileData';
import type { MedicalProfileFormValues } from '@/utils/medical-profile/validation';

type MediInsert = Database['public']['Tables']['medi_profile']['Insert'];

function mapFormToRpcPayload(values: MedicalProfileFormValues, profileId: string) {
  return {
    p_profile_id: profileId,
    p_medicare_number: emptyToUndef(values.medicare_number),
    p_medicare_expiry: emptyToUndef(values.medicare_expiry),
    p_health_care_card_number: emptyToUndef(values.health_care_card_number),
    p_health_care_card_expiry: emptyToUndef(values.health_care_card_expiry),
    p_health_fund_name: emptyToUndef(values.health_fund_name),
    p_health_fund_number: emptyToUndef(values.health_fund_number),
    p_has_dietary_requirements: values.has_dietary_requirements,
    p_dietary_comments: emptyToUndef(values.dietary_comments),
    p_menu_selection: emptyToUndef(values.menu_selection),
    p_is_fully_immunised: values.is_fully_immunised,
    p_last_tetanus_date: emptyToUndef(values.last_tetanus_date),
    p_requires_support: values.requires_support,
    p_support_details: emptyToUndef(values.support_details),
    p_has_carer: values.has_carer,
    p_carer_name: emptyToUndef(values.carer_name),
  };
}

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  return t === '' ? undefined : t;
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function buildInsertRow(personId: string, values: MedicalProfileFormValues): MediInsert {
  return {
    person_id: personId,
    medicare_number: emptyToNull(values.medicare_number),
    medicare_expiry: emptyToNull(values.medicare_expiry),
    health_care_card_number: emptyToNull(values.health_care_card_number),
    health_care_card_expiry: emptyToNull(values.health_care_card_expiry),
    health_fund_name: emptyToNull(values.health_fund_name),
    health_fund_number: emptyToNull(values.health_fund_number),
    has_dietary_requirements: values.has_dietary_requirements,
    dietary_comments: emptyToNull(values.dietary_comments),
    menu_selection: emptyToNull(values.menu_selection),
    is_fully_immunised: values.is_fully_immunised,
    last_tetanus_date: emptyToNull(values.last_tetanus_date),
    requires_support: values.requires_support,
    support_details: emptyToNull(values.support_details),
    has_carer: values.has_carer,
    carer_name: emptyToNull(values.carer_name),
  };
}

/**
 * Resolves effective member id: delegated target when proxy is active, otherwise self member.
 */
export function useEffectiveMedicalMemberId(): {
  effectiveMemberId: string | null;
  isReady: boolean;
  blockedReason: 'needs_member_profile' | 'proxy_invalid' | 'no_organisation' | null;
} {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const proxy = useProxyMode();
  const { data: memberData, isLoading, isError } = useMemberProfileData();

  if (!organisationId) {
    return { effectiveMemberId: null, isReady: true, blockedReason: 'no_organisation' };
  }

  if (isLoading) {
    return { effectiveMemberId: null, isReady: false, blockedReason: null };
  }

  if (isError || !memberData || memberData === 'needs_setup') {
    return { effectiveMemberId: null, isReady: true, blockedReason: 'needs_member_profile' };
  }

  if (proxy.isProxyActive) {
    if (proxy.isValidating) {
      return { effectiveMemberId: null, isReady: false, blockedReason: null };
    }
    if (proxy.validationError || !proxy.targetMemberId) {
      return { effectiveMemberId: null, isReady: true, blockedReason: 'proxy_invalid' };
    }
    return { effectiveMemberId: proxy.targetMemberId, isReady: true, blockedReason: null };
  }

  const selfMemberId = memberData.member?.id ?? null;
  if (!selfMemberId || !user?.id) {
    return { effectiveMemberId: null, isReady: true, blockedReason: 'needs_member_profile' };
  }

  return { effectiveMemberId: selfMemberId, isReady: true, blockedReason: null };
}

export function useMedicalProfilePage() {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const queryClient = useQueryClient();

  const { effectiveMemberId, isReady, blockedReason } = useEffectiveMedicalMemberId();
  const medicalQuery = useMedicalProfileData(effectiveMemberId);

  const saveMutation = useMutation({
    mutationFn: async (values: MedicalProfileFormValues) => {
      if (!client || !organisationId || !effectiveMemberId || !user?.id) {
        throw new Error('Cannot save medical profile without full context.');
      }

      const load = await fetchMedicalProfileData(secure, effectiveMemberId, organisationId);
      if (!isOk(load)) {
        throw new Error(load.error.message);
      }
      const { profile, personId } = load.data;

      if (profile?.id) {
        const upd = await client.rpc('app_medi_profile_update', mapFormToRpcPayload(values, profile.id));
        if (upd.error) {
          throw new Error(upd.error.message || 'Could not update medical profile.');
        }
        return;
      }

      const insertRow = buildInsertRow(personId, values);
      const ins = await client.from('medi_profile').insert(insertRow).select('id').single();
      if (ins.error || !ins.data?.id) {
        throw new Error(ins.error?.message ?? 'Could not create medical profile.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['enhancedLanding'] });
    },
  });

  return {
    organisationId,
    userId: user?.id ?? null,
    effectiveMemberId,
    gateReady: isReady,
    blockedReason,
    load: medicalQuery,
    saveMedicalProfile: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
