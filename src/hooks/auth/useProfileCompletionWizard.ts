import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { useZodForm } from '@solvera/pace-core/hooks';
import { isOk } from '@solvera/pace-core/types';
import { usePersonAddresses } from '@/hooks/shared/useAddressData';
import { usePhoneNumbers } from '@/hooks/contacts/usePhoneNumbers';
import { useReferenceData } from '@/shared/hooks/useReferenceData';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/hooks/useEnhancedLanding';
import { buildCompletionPath } from '@/hooks/auth/profileWizardShell';
import {
  emptyMemberProfileFormValues,
  memberProfileWizardFormSchema,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import {
  PROFILE_WIZARD_STEP_COUNT,
  PROFILE_WIZARD_STEP_LABELS,
  combineWizardShellError,
  combineWizardShellLoading,
  useGoogleMapsPreloadForWizard,
  type ProfileWizardSaveStatus,
} from '@/hooks/auth/profileWizardHookUtils';
import { useProfileWizardFormPrefill } from '@/hooks/auth/useProfileWizardFormPrefill';
import { useProfileWizardStepActions } from '@/hooks/auth/useProfileWizardStepActions';

export {
  PROFILE_WIZARD_STEP_COUNT,
  PROFILE_WIZARD_STEP_LABELS,
  type ProfileWizardSaveStatus,
  type GoogleMapsPreloadState,
} from '@/hooks/auth/profileWizardHookUtils';

export function useProfileCompletionWizard() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;

  const eventSlugRaw = searchParams.get('eventSlug');
  const formSlugRaw = searchParams.get('formSlug');
  const eventSlug =
    eventSlugRaw != null && eventSlugRaw.trim() !== '' ? eventSlugRaw.trim() : null;
  const formSlug = formSlugRaw != null && formSlugRaw.trim() !== '' ? formSlugRaw.trim() : null;

  const referenceQuery = useReferenceData();

  const personMemberQuery = useQuery({
    queryKey: ['profileWizardPersonMember', 'v1', userId, organisationId],
    enabled: Boolean(secure && userId && organisationId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!secure || !userId || !organisationId) {
        throw new Error('Profile wizard requires organisation context.');
      }
      const r = await fetchCurrentPersonMember(secure, userId, organisationId);
      if (!isOk(r)) {
        if (r.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
          return null;
        }
        throw new Error(r.error.message);
      }
      return r.data;
    },
  });

  const person = personMemberQuery.data?.person ?? null;
  const member = personMemberQuery.data?.member ?? null;
  const personId = person?.id ?? null;

  const residentialId = person?.residential_address_id ?? null;
  const postalId = person?.postal_address_id ?? null;
  const hasAddressIds = residentialId != null || postalId != null;

  const phonesQuery = usePhoneNumbers(personId);
  const addressQuery = usePersonAddresses(residentialId, postalId);

  const form = useZodForm({
    schema: memberProfileWizardFormSchema,
    defaultValues: emptyMemberProfileFormValues(),
    mode: 'onBlur',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<ProfileWizardSaveStatus>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
  const mapsPreload = useGoogleMapsPreloadForWizard();

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const timerRef = redirectTimerRef;
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const phones = useMemo(() => phonesQuery.data ?? [], [phonesQuery.data]);
  const effectiveMemberId = member?.id ?? createdMemberId;

  const isShellLoading = combineWizardShellLoading(
    referenceQuery.isLoading,
    personMemberQuery.isLoading,
    personId,
    phonesQuery.isLoading,
    addressQuery.isLoading,
    hasAddressIds
  );

  const shellError = combineWizardShellError(
    referenceQuery.isError,
    personMemberQuery.isError,
    phonesQuery.isError,
    addressQuery.isError,
    referenceQuery.error,
    personMemberQuery.error,
    phonesQuery.error,
    addressQuery.error
  );

  useProfileWizardFormPrefill({
    form,
    personMemberQueryLoading: personMemberQuery.isLoading,
    personId,
    phonesQueryLoading: phonesQuery.isLoading,
    addressQueryLoading: addressQuery.isLoading,
    hasAddressIds,
    person,
    member,
    phones,
    residential: addressQuery.addressData.residential,
    postal: addressQuery.addressData.postal,
  });

  const progressValue = useMemo(() => {
    return Math.round(((currentStep + 1) / PROFILE_WIZARD_STEP_COUNT) * 100);
  }, [currentStep]);

  const {
    saveAndContinue,
    goToPrevious,
    goToStep,
    cancel,
    finalizeWizard,
    skipFinalStep,
  } = useProfileWizardStepActions({
    form,
    queryClient,
    currentStep,
    setCurrentStep,
    setSaveStatus,
    setSaveErrorMessage,
    setCreatedMemberId,
    createdMemberId,
    userId,
    organisationId,
    personId,
    person,
    member,
    phones,
    effectiveMemberId,
    residentialRow: addressQuery.addressData.residential,
    postalRow: addressQuery.addressData.postal,
    addressUnresolved: addressQuery.addressData.isUnresolved,
    eventSlug,
    formSlug,
    redirectTimerRef,
  });

  const completionPathPreview = useMemo(
    () => buildCompletionPath(eventSlug, formSlug),
    [eventSlug, formSlug]
  );

  return {
    currentStep,
    totalSteps: PROFILE_WIZARD_STEP_COUNT,
    stepLabels: PROFILE_WIZARD_STEP_LABELS,
    progressValue,
    isShellLoading,
    shellError,
    referenceData: referenceQuery.data ?? null,
    personMember: personMemberQuery.data ?? null,
    person,
    member,
    phones,
    addressData: addressQuery.addressData,
    mapsPreload,
    saveStatus,
    saveErrorMessage,
    eventSlug,
    formSlug,
    completionPathPreview,
    form,
    saveAndContinue,
    goToPrevious,
    goToStep,
    cancel,
    completeProfile: () => void finalizeWizard(),
    skipFinalStep: () => void skipFinalStep(),
  };
}
