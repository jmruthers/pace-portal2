import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { buildCompletionPath, validateShellStep } from '@/hooks/auth/profileWizardShell';
import {
  normalizeMembershipStatusForSave,
  persistProfileWizardStep0,
  persistProfileWizardStep1,
  persistProfileWizardStep2,
} from '@/hooks/auth/profileWizardPersistence';
import {
  PROFILE_WIZARD_STEP_COUNT,
  type ProfileWizardSaveStatus,
} from '@/hooks/auth/profileWizardHookUtils';
import {
  validateMemberProfileWizardStep,
  type MemberProfileFormValues,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';
import type { MemberProfileFormPhone } from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import { bustCurrentPersonMemberCache } from '@/shared/lib/utils/userUtils';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';

type PersonRow = Database['public']['Tables']['core_person']['Row'] | null;
type MemberRow = Database['public']['Tables']['core_member']['Row'] | null;

export function useProfileWizardStepActions(args: {
  form: UseFormReturn<MemberProfileFormValues>;
  queryClient: QueryClient;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<ProfileWizardSaveStatus>>;
  setSaveErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setCreatedMemberId: React.Dispatch<React.SetStateAction<string | null>>;
  createdMemberId: string | null;
  userId: string | null;
  organisationId: string | null;
  personId: string | null;
  person: PersonRow;
  member: MemberRow;
  phones: MemberProfileFormPhone[];
  effectiveMemberId: string | null;
  residentialRow: CoreAddressRow | null;
  postalRow: CoreAddressRow | null;
  addressUnresolved: boolean;
  eventSlug: string | null;
  formSlug: string | null;
  redirectTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}) {
  const navigate = useNavigate();
  const secure = useSecureSupabase();
  const {
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
    residentialRow,
    postalRow,
    addressUnresolved,
    eventSlug,
    formSlug,
    redirectTimerRef,
  } = args;

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
      const db = toTypedSupabase(secure) as SupabaseClient<Database> | null;
      if (!db || !organisationId || !personId || !userId) {
        throw new Error('Missing session or profile context.');
      }
      const values = form.getValues();

      if (stepIndex === 0) {
        const knownMemberId = member?.id ?? createdMemberId ?? null;
        const { memberId } = await persistProfileWizardStep0({
          db,
          organisationId,
          userId,
          personId,
          memberId: knownMemberId,
          values,
          existingMembershipStatus: normalizeMembershipStatusForSave(member?.membership_status),
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
          residentialRow,
          postalRow,
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
        existingMembershipStatus: normalizeMembershipStatusForSave(member?.membership_status),
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
      member?.membership_status,
      createdMemberId,
      residentialRow,
      postalRow,
      invalidatePersonBundle,
      effectiveMemberId,
      setCreatedMemberId,
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
        addressUnresolved,
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
  }, [clearStepFieldErrors, currentStep, form, person, phones, addressUnresolved]);

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
  }, [currentStep, validateCurrentStep, runSavePulse, persistCurrentStep, setSaveErrorMessage, setSaveStatus, setCurrentStep]);

  const goToPrevious = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, [setCurrentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step < 0 || step >= PROFILE_WIZARD_STEP_COUNT || step > currentStep) {
        return;
      }
      setCurrentStep(step);
    },
    [currentStep, setCurrentStep]
  );

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
  }, [
    validateCurrentStep,
    persistCurrentStep,
    currentStep,
    runSavePulse,
    navigate,
    eventSlug,
    formSlug,
    setSaveErrorMessage,
    setSaveStatus,
    redirectTimerRef,
  ]);

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
  }, [runSavePulse, navigate, eventSlug, formSlug, setSaveStatus, redirectTimerRef]);

  return {
    saveAndContinue,
    goToPrevious,
    goToStep,
    cancel,
    finalizeWizard,
    skipFinalStep,
  };
}
