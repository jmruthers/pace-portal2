import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { useZodForm } from '@solvera/pace-core/hooks';
import { isOk } from '@solvera/pace-core/types';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loader';
import { usePersonAddresses } from '@/hooks/shared/useAddressData';
import { usePhoneNumbers } from '@/hooks/contacts/usePhoneNumbers';
import { useReferenceData } from '@/shared/hooks/useReferenceData';
import { bustCurrentPersonMemberCache, fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/hooks/useEnhancedLanding';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { buildCompletionPath, validateShellStep } from '@/hooks/auth/profileWizardShell';
import {
  buildMemberProfileFormDefaults,
  emptyMemberProfileFormValues,
  memberProfileWizardFormSchema,
  validateMemberProfileWizardStep,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import {
  persistProfileWizardStep0,
  persistProfileWizardStep1,
  persistProfileWizardStep2,
} from '@/hooks/auth/profileWizardPersistence';

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
  addressLoading: boolean,
  hasAddressIds: boolean
): boolean {
  return Boolean(
    referenceLoading ||
      personLoading ||
      (personId != null && phonesLoading) ||
      (hasAddressIds && addressLoading)
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

/* eslint-disable complexity -- PR06 wizard orchestrates queries, form reset, maps preload, and step persistence in one hook; split tracked as follow-up. */
/* eslint-disable max-lines-per-function */
export function useProfileCompletionWizard() {
  const navigate = useNavigate();
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
  /** Set when a known `core_member` id is available before TanStack refetch returns. */
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
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

  const profilePrefillKey = useMemo(() => {
    const phoneSig = phones.map((p) => `${p.id}:${p.phone_number}`).join('|');
    return [
      person?.id ?? '',
      member?.id ?? '',
      member?.updated_at ?? '',
      phoneSig,
      addressQuery.addressData.residential?.id ?? '',
      addressQuery.addressData.postal?.id ?? '',
      addressQuery.addressData.residential?.updated_at ?? '',
      addressQuery.addressData.postal?.updated_at ?? '',
    ].join('\u001f');
  }, [
    person?.id,
    member?.id,
    member?.updated_at,
    phones,
    addressQuery.addressData.residential?.id,
    addressQuery.addressData.postal?.id,
    addressQuery.addressData.residential?.updated_at,
    addressQuery.addressData.postal?.updated_at,
  ]);

  useEffect(() => {
    if (personMemberQuery.isLoading) {
      return;
    }
    if (personId != null && phonesQuery.isLoading) {
      return;
    }
    if (hasAddressIds && addressQuery.isLoading) {
      return;
    }
    form.reset(
      buildMemberProfileFormDefaults({
        person,
        member,
        phones,
        residential: addressQuery.addressData.residential,
        postal: addressQuery.addressData.postal,
      })
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by profilePrefillKey so React Query object identity does not retrigger reset every render */
  }, [
    profilePrefillKey,
    personMemberQuery.isLoading,
    hasAddressIds,
    personId,
    phonesQuery.isLoading,
    addressQuery.isLoading,
  ]);

  const progressValue = useMemo(() => {
    return Math.round(((currentStep + 1) / PROFILE_WIZARD_STEP_COUNT) * 100);
  }, [currentStep]);

  const invalidatePersonBundle = useCallback(async () => {
    if (userId != null && organisationId != null) {
      bustCurrentPersonMemberCache(userId, organisationId);
    }
    await queryClient.invalidateQueries({
      queryKey: ['profileWizardPersonMember', 'v1', userId, organisationId],
    });
    await queryClient.invalidateQueries({ queryKey: ['profileWizardPhones', 'v1', personId] });
    await queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'profileWizardAddresses',
    });
  }, [queryClient, userId, organisationId, personId]);

  const persistCurrentStep = useCallback(
    async (stepIndex: number) => {
      const db = toTypedSupabase(secure);
      if (!db || !organisationId || !personId || !userId) {
        throw new Error('Missing session or profile context.');
      }
      const values = form.getValues();

      if (stepIndex === 0) {
        /** Prefer server `member.id`; use `createdMemberId` until TanStack refetch returns (avoids a second INSERT → 403). */
        const knownMemberId = member?.id ?? createdMemberId ?? null;
        const { memberId } = await persistProfileWizardStep0({
          db,
          organisationId,
          userId,
          personId,
          memberId: knownMemberId,
          values,
          existingMembershipStatus: member?.membership_status ?? null,
        });
        if (memberId != null) {
          setCreatedMemberId(memberId);
        }
        await invalidatePersonBundle();
        return;
      }

      if (stepIndex === 1) {
        await persistProfileWizardStep1({
          db,
          organisationId,
          userId,
          personId,
          values,
          residentialRow: addressQuery.addressData.residential,
          postalRow: addressQuery.addressData.postal,
        });
        await invalidatePersonBundle();
        return;
      }

      const mId = effectiveMemberId;
      if (mId == null) {
        const hasMembershipInput =
          (values.membership_number != null && values.membership_number.trim() !== '') ||
          values.membership_type_id != null;
        if (!hasMembershipInput) {
          return;
        }
        throw new Error(
          'Membership details cannot be saved because membership record creation is not permitted for this account.'
        );
      }
      await persistProfileWizardStep2({
        db,
        userId,
        memberId: mId,
        values,
        existingMembershipStatus: member?.membership_status ?? null,
      });
      await invalidatePersonBundle();
    },
    [
      secure,
      organisationId,
      personId,
      userId,
      form,
      member?.id,
      createdMemberId,
      member?.membership_status,
      addressQuery.addressData.residential,
      addressQuery.addressData.postal,
      invalidatePersonBundle,
      effectiveMemberId,
    ]
  );

  const clearStepFieldErrors = useCallback(
    (stepIndex: number): void => {
      if (stepIndex === 0) {
        form.clearErrors([
          'first_name',
          'last_name',
          'middle_name',
          'preferred_name',
          'email',
          'date_of_birth',
          'gender_id',
          'pronoun_id',
        ]);
        return;
      }
      if (stepIndex === 1) {
        form.clearErrors(['residential', 'postal', 'phones']);
        return;
      }
      form.clearErrors(['membership_number', 'membership_type_id']);
    },
    [form]
  );

  const validateCurrentStep = useCallback((): { ok: true } | { ok: false; message: string } => {
    clearStepFieldErrors(currentStep);
    const result = validateMemberProfileWizardStep(currentStep, form.getValues());
    if (!result.ok) {
      for (const issue of result.issues) {
        if (issue.path.trim() === '') {
          continue;
        }
        let targetPath = issue.path;
        /** Step 1 custom array issues can arrive without the `phones.` prefix. */
        if (currentStep === 1 && /^\d+\./.test(targetPath)) {
          targetPath = `phones.${targetPath}`;
        }
        form.setError(targetPath as never, { type: 'manual', message: issue.message });
      }
      return result;
    }
    if (currentStep === 0 || currentStep === 1) {
      const shell = validateShellStep(currentStep, {
        person,
        phones,
        addressUnresolved: addressQuery.addressData.isUnresolved,
      });
      if (!shell.ok) {
        form.setError(currentStep === 0 ? ('root' as never) : ('residential' as never), {
          type: 'manual',
          message: shell.message,
        });
        return { ok: false, message: shell.message };
      }
    }
    return { ok: true };
  }, [clearStepFieldErrors, currentStep, form, person, phones, addressQuery.addressData.isUnresolved]);

  const runSavePulse = useCallback(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 280);
    });
  }, []);

  const saveAndContinue = useCallback(async () => {
    const v = validateCurrentStep();
    if (!v.ok) {
      return;
    }
    setSaveErrorMessage(null);
    setSaveStatus('saving');
    try {
      await persistCurrentStep(currentStep);
      await runSavePulse();
      if (currentStep < PROFILE_WIZARD_STEP_COUNT - 1) {
        setCurrentStep((s) => s + 1);
      }
      setSaveStatus('idle');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Try again or return to the dashboard.';
      setSaveErrorMessage(message);
      setSaveStatus('error');
    }
  }, [currentStep, validateCurrentStep, runSavePulse, persistCurrentStep]);

  const goToPrevious = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= PROFILE_WIZARD_STEP_COUNT || step > currentStep) {
      return;
    }
    setCurrentStep(step);
  }, [currentStep]);

  const cancel = useCallback(() => {
    navigate('/dashboard', { replace: false });
  }, [navigate]);

  const finalizeWizard = useCallback(async () => {
    const v = validateCurrentStep();
    if (!v.ok) {
      return;
    }
    setSaveErrorMessage(null);
    setSaveStatus('saving');
    try {
      await persistCurrentStep(currentStep);
      await runSavePulse();
      setSaveStatus('success');
      const target = buildCompletionPath(eventSlug, formSlug);
      redirectTimerRef.current = setTimeout(() => {
        navigate(target, { replace: false });
      }, 650);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Try again or return to the dashboard.';
      setSaveErrorMessage(message);
      setSaveStatus('error');
    }
  }, [validateCurrentStep, persistCurrentStep, currentStep, runSavePulse, navigate, eventSlug, formSlug]);

  const skipFinalStep = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await runSavePulse();
      setSaveStatus('success');
      const target = buildCompletionPath(eventSlug, formSlug);
      redirectTimerRef.current = setTimeout(() => {
        navigate(target, { replace: false });
      }, 650);
    } catch {
      setSaveStatus('error');
    }
  }, [runSavePulse, navigate, eventSlug, formSlug]);

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
/* eslint-enable max-lines-per-function */
