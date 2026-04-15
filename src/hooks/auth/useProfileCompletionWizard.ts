import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { toast } from '@solvera/pace-core/components';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { isOk } from '@solvera/pace-core/types';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loader';
import { useAddressData } from '@/hooks/shared/useAddressData';
import { usePhoneNumbers } from '@/hooks/contacts/usePhoneNumbers';
import { useReferenceData } from '@/shared/hooks/useReferenceData';
import { fetchCurrentPersonMember, type CurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/hooks/useEnhancedLanding';
import {
  buildCompletionPath,
  validateShellStep,
  type ValidateShellStepResult,
} from '@/hooks/auth/profileWizardShell';

export const PROFILE_WIZARD_STEP_COUNT = 3;

export const PROFILE_WIZARD_STEP_LABELS = [
  'Personal details',
  'Contact details',
  'Membership details',
] as const;

export type ProfileWizardSaveStatus = 'idle' | 'saving' | 'error' | 'success';

export type GoogleMapsPreloadState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; result: Awaited<ReturnType<typeof loadGoogleMapsWithPlaces>> };

function useGoogleMapsPreloadForWizard(): GoogleMapsPreloadState {
  const [mapsPreload, setMapsPreload] = useState<GoogleMapsPreloadState>(() => ({ phase: 'loading' }));
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadGoogleMapsWithPlaces();
      if (!cancelled) {
        setMapsPreload({ phase: 'ready', result });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return mapsPreload;
}

function combineWizardShellLoading(
  referenceLoading: boolean,
  personLoading: boolean,
  personId: string | null,
  phonesLoading: boolean,
  personAddressId: string | null,
  addressLoading: boolean
): boolean {
  return Boolean(
    referenceLoading ||
      personLoading ||
      (personId != null && phonesLoading) ||
      (personAddressId != null && addressLoading)
  );
}

function combineWizardShellError(
  referenceError: boolean,
  personError: boolean,
  phonesError: boolean,
  addressError: boolean,
  refErr: unknown,
  personErr: unknown,
  phonesErr: unknown,
  addressErr: unknown
): unknown | null {
  if (!referenceError && !personError && !phonesError && !addressError) {
    return null;
  }
  return refErr ?? personErr ?? phonesErr ?? addressErr;
}

export function useProfileCompletionWizard() {
  const navigate = useNavigate();
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
    queryFn: async (): Promise<CurrentPersonMember | null> => {
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
  const personAddressId = person?.address_id ?? null;

  const phonesQuery = usePhoneNumbers(personId);
  const addressQuery = useAddressData(personAddressId);

  const [currentStep, setCurrentStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<ProfileWizardSaveStatus>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const mapsPreload = useGoogleMapsPreloadForWizard();

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current != null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const phones = useMemo(() => phonesQuery.data ?? [], [phonesQuery.data]);
  const addressUnresolved = addressQuery.addressData.isUnresolved;

  const isShellLoading = combineWizardShellLoading(
    referenceQuery.isLoading,
    personMemberQuery.isLoading,
    personId,
    phonesQuery.isLoading,
    personAddressId,
    addressQuery.isLoading
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

  const progressValue = useMemo(() => {
    return Math.round(((currentStep + 1) / PROFILE_WIZARD_STEP_COUNT) * 100);
  }, [currentStep]);

  const validateCurrentStep = useCallback((): ValidateShellStepResult => {
    return validateShellStep(currentStep, {
      person,
      phones,
      addressUnresolved,
    });
  }, [currentStep, person, phones, addressUnresolved]);

  const runSavePulse = useCallback(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 280);
    });
  }, []);

  const saveAndContinue = useCallback(async () => {
    const v = validateCurrentStep();
    if (!v.ok) {
      setValidationMessage(v.message);
      return;
    }
    setValidationMessage(null);
    setSaveStatus('saving');
    try {
      await runSavePulse();
      if (currentStep < PROFILE_WIZARD_STEP_COUNT - 1) {
        setCurrentStep((s) => s + 1);
      }
      setSaveStatus('idle');
    } catch {
      setSaveStatus('error');
    }
  }, [currentStep, validateCurrentStep, runSavePulse]);

  const goToPrevious = useCallback(() => {
    setValidationMessage(null);
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= PROFILE_WIZARD_STEP_COUNT || step > currentStep) {
      return;
    }
    setValidationMessage(null);
    setCurrentStep(step);
  }, [currentStep]);

  const cancel = useCallback(() => {
    setValidationMessage(null);
    navigate('/dashboard', { replace: false });
  }, [navigate]);

  const finalizeWizard = useCallback(async () => {
    const v = validateCurrentStep();
    if (!v.ok) {
      setValidationMessage(v.message);
      return;
    }
    setValidationMessage(null);
    setSaveStatus('saving');
    try {
      await runSavePulse();
      toast({
        title: 'Profile saved',
        description: 'Returning you to your next step.',
        variant: 'success',
        duration: 4000,
      });
      setSaveStatus('success');
      const target = buildCompletionPath(eventSlug, formSlug);
      redirectTimerRef.current = setTimeout(() => {
        navigate(target, { replace: false });
      }, 650);
    } catch {
      setSaveStatus('error');
    }
  }, [validateCurrentStep, runSavePulse, navigate, eventSlug, formSlug]);

  const completionPathPreview = useMemo(
    () => buildCompletionPath(eventSlug, formSlug),
    [eventSlug, formSlug]
  );

  return {
    /** Step index 0..2 */
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
    validationMessage,
    eventSlug,
    formSlug,
    completionPathPreview,
    saveAndContinue,
    goToPrevious,
    goToStep,
    cancel,
    completeProfile: () => void finalizeWizard(),
    skipFinalStep: () => void finalizeWizard(),
  };
}
