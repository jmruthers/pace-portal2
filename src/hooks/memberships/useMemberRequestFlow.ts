import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { createOrganisationId, createUserId, isOk } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { filterMembershipTypesByAge, fetchOrgMembershipTypes } from '@/lib/fetchOrgMembershipTypes';
import { fetchOrgSignupForm } from '@/lib/fetchOrgSignupForm';
import { searchJoinableOrganisations } from '@/lib/searchJoinableOrganisations';
import {
  loadPendingRequestsForGuard,
  submitMemberRequestFlow,
} from '@/lib/submitMemberRequestFlow';
import {
  asPreSubmitFailure,
  type MemberRequestPreSubmitFailureCode,
} from '@/lib/validateMemberRequestPreSubmit';
import { preSubmitFailureMessage } from '@/lib/memberRequestRules';
import type {
  JoinableOrganisation,
  MemberRequestFlowStartOptions,
  MemberRequestFlowStep,
  MembershipListItem,
  OrgMembershipTypeOption,
  OrgSignupFormReady,
  TeamMemberRequestType,
  UseMemberRequestFlowResult,
} from '@/lib/memberRequestTypes';

export type { UseMemberRequestFlowResult } from '@/lib/memberRequestTypes';
import type { ProfileProgressTracked } from '@/shared/lib/profileProgress';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';

export type UseMemberRequestFlowOptions = {
  existingMemberships: MembershipListItem[];
  onSubmitted: (item: MembershipListItem) => void;
};

const IDLE: MemberRequestFlowStep = 'idle';

function nextStepAfterOrgSelect(
  requestType: TeamMemberRequestType,
  eligibleCount: number
): MemberRequestFlowStep {
  if (requestType === 'transfer') {
    return 'source_org';
  }
  if (eligibleCount === 0) {
    return 'membership_type';
  }
  if (eligibleCount === 1) {
    return 'org_form';
  }
  return 'membership_type';
}

function nextStepAfterSourceOrg(eligibleCount: number): MemberRequestFlowStep {
  if (eligibleCount === 0) {
    return 'membership_type';
  }
  if (eligibleCount === 1) {
    return 'org_form';
  }
  return 'membership_type';
}

/**
 * PR22 — Inline join/transfer flow state (URL unchanged).
 */
export function useMemberRequestFlow(options: UseMemberRequestFlowOptions): UseMemberRequestFlowResult {
  const { existingMemberships, onSubmitted } = options;
  const { user, supabase } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const secureClient = toTypedSupabase(secure);
  const orgCtx = useOrganisationsContextOptional();
  const organisationId = orgCtx?.selectedOrganisation?.id ?? null;

  const [flowStep, setFlowStep] = useState<MemberRequestFlowStep>(IDLE);
  const [requestType, setRequestType] = useState<TeamMemberRequestType>('join');
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<JoinableOrganisation[]>([]);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [orgSearchError, setOrgSearchError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<JoinableOrganisation | null>(null);
  const [sourceOrgId, setSourceOrgId] = useState<string | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<OrgMembershipTypeOption[]>([]);
  const [selectedMembershipTypeId, setSelectedMembershipTypeId] = useState<number | null>(null);
  const [orgSignupForm, setOrgSignupForm] = useState<OrgSignupFormReady | null>(null);
  const [orgFormLoading, setOrgFormLoading] = useState(false);
  const [preSubmitError, setPreSubmitError] = useState<string | null>(null);
  const [preSubmitCode, setPreSubmitCode] = useState<MemberRequestPreSubmitFailureCode | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationOrgName, setConfirmationOrgName] = useState<string | null>(null);
  const [personDob, setPersonDob] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState<ProfileProgressTracked>({
    person: null,
    member: null,
  });

  const baseClient = supabase as SupabaseClient<Database> | null;

  const visibleOrgSearchResults =
    orgSearchQuery.trim().length >= 2 ? orgSearchResults : [];

  const activeSourceMemberships = useMemo(
    () => existingMemberships.filter((m) => m.membershipStatus === 'Active'),
    [existingMemberships]
  );

  const eligibleMembershipTypes = useMemo(
    () => filterMembershipTypesByAge(personDob, membershipTypes),
    [personDob, membershipTypes]
  );

  useEffect(() => {
    if (flowStep !== 'org_search' || !baseClient) return;
    const q = orgSearchQuery.trim();
    if (q.length < 2) return;

    const handle = window.setTimeout(() => {
      setOrgSearchLoading(true);
      setOrgSearchError(null);
      void searchJoinableOrganisations(baseClient, q)
        .then((res) => {
          if (isOk(res)) {
            setOrgSearchResults(res.data);
            setOrgSearchError(null);
          } else {
            setOrgSearchResults([]);
            setOrgSearchError(res.error.message ?? 'Could not search organisations.');
          }
        })
        .finally(() => setOrgSearchLoading(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [orgSearchQuery, flowStep, baseClient]);

  const loadPersonContext = useCallback(async () => {
    if (!secure || !user?.id || !organisationId) return;
    const pm = await fetchCurrentPersonMember(secure, user.id, organisationId);
    if (!isOk(pm)) return;
    setPersonId(pm.data.person.id);
    setPersonDob(pm.data.person.date_of_birth ?? null);
    setProgressInput({
      person: pm.data.person,
      member: pm.data.member,
    });
  }, [secure, user, organisationId]);

  const loadOrgContext = useCallback(
    async (org: JoinableOrganisation) => {
      if (!secureClient) return;
      setOrgFormLoading(true);
      const [typesRes, formRes] = await Promise.all([
        fetchOrgMembershipTypes(secureClient, org.id),
        fetchOrgSignupForm(secureClient, org.id),
      ]);
      if (isOk(typesRes)) {
        setMembershipTypes(typesRes.data);
        const eligible = filterMembershipTypesByAge(personDob, typesRes.data);
        if (eligible.length === 1) {
          setSelectedMembershipTypeId(eligible[0].id);
        }
      }
      if (isOk(formRes)) {
        setOrgSignupForm(formRes.data);
      }
      setOrgFormLoading(false);
    },
    [secureClient, personDob]
  );

  const startFlow = useCallback(
    (opts?: MemberRequestFlowStartOptions) => {
      setPreSubmitError(null);
      setPreSubmitCode(null);
      setSubmitError(null);
      setConfirmationOrgName(null);
      setRequestType('join');
      setSourceOrgId(null);
      setSelectedMembershipTypeId(null);
      void loadPersonContext();

      if (opts?.prefilledOrgId) {
        const org: JoinableOrganisation = {
          id: createOrganisationId(opts.prefilledOrgId),
          name: opts.prefilledOrgName ?? 'Organisation',
          displayName: opts.prefilledOrgName ?? 'Organisation',
        };
        setSelectedOrg(org);
        setOrgSearchQuery(org.displayName);
        void loadOrgContext(org).then(() => {
          setFlowStep('request_type');
        });
        return;
      }

      setSelectedOrg(null);
      setOrgSearchQuery('');
      setOrgSearchResults([]);
      setOrgSearchError(null);
      setFlowStep('request_type');
    },
    [loadPersonContext, loadOrgContext]
  );

  const cancelFlow = useCallback(() => {
    setFlowStep(IDLE);
    setPreSubmitError(null);
    setPreSubmitCode(null);
    setSubmitError(null);
    setConfirmationOrgName(null);
  }, []);

  const selectOrg = useCallback(
    (org: JoinableOrganisation) => {
      setSelectedOrg(org);
      setOrgSearchQuery(org.displayName);
      void loadOrgContext(org);
    },
    [loadOrgContext]
  );

  const goNext = useCallback(() => {
    setPreSubmitError(null);
    setPreSubmitCode(null);
    if (flowStep === 'request_type') {
      if (selectedOrg) {
        const eligible = filterMembershipTypesByAge(personDob, membershipTypes);
        setFlowStep(nextStepAfterOrgSelect(requestType, eligible.length));
        return;
      }
      setFlowStep('org_search');
      return;
    }
    if (flowStep === 'org_search') {
      if (!selectedOrg) return;
      const eligible = filterMembershipTypesByAge(personDob, membershipTypes);
      setFlowStep(nextStepAfterOrgSelect(requestType, eligible.length));
      return;
    }
    if (flowStep === 'source_org') {
      if (!sourceOrgId) return;
      const eligible = filterMembershipTypesByAge(personDob, membershipTypes);
      setFlowStep(nextStepAfterSourceOrg(eligible.length));
      return;
    }
    if (flowStep === 'membership_type') {
      const eligible = filterMembershipTypesByAge(personDob, membershipTypes);
      if (eligible.length === 0) {
        setPreSubmitCode('AGE_INELIGIBLE');
        setPreSubmitError(
          'No membership types are available for your age at this organisation.'
        );
        return;
      }
      if (selectedMembershipTypeId == null) return;
      setFlowStep('org_form');
    }
  }, [
    flowStep,
    selectedOrg,
    requestType,
    personDob,
    membershipTypes,
    sourceOrgId,
    selectedMembershipTypeId,
  ]);

  const goBack = useCallback(() => {
    setPreSubmitError(null);
    setPreSubmitCode(null);
    if (flowStep === 'confirmation') {
      setFlowStep('org_form');
      return;
    }
    if (flowStep === 'org_form') {
      const eligible = filterMembershipTypesByAge(personDob, membershipTypes);
      if (eligible.length === 0 || eligible.length > 1) {
        setFlowStep('membership_type');
        return;
      }
      if (requestType === 'transfer') {
        setFlowStep('source_org');
        return;
      }
      setFlowStep('org_search');
      return;
    }
    if (flowStep === 'membership_type') {
      setFlowStep(requestType === 'transfer' ? 'source_org' : 'org_search');
      return;
    }
    if (flowStep === 'source_org') {
      setFlowStep('org_search');
      return;
    }
    if (flowStep === 'org_search') {
      setFlowStep('request_type');
      return;
    }
    if (flowStep === 'request_type') {
      cancelFlow();
    }
  }, [flowStep, personDob, membershipTypes, requestType, cancelFlow]);

  const submitMutation = useMutation({
    mutationFn: async (formValues: Record<string, unknown> | null) => {
      if (!secureClient || !personId || !selectedOrg) {
        throw new Error('Sign-in and organisation selection are required.');
      }
      const typeId = selectedMembershipTypeId ?? eligibleMembershipTypes[0]?.id ?? null;
      if (typeId == null) {
        throw Object.assign(
          new Error('The selected membership type is not available for your age.'),
          { preSubmit: true, preSubmitCode: 'AGE_INELIGIBLE' as const }
        );
      }

      const pendingRes = await loadPendingRequestsForGuard(secureClient, personId);
      if (!isOk(pendingRes)) {
        throw new Error(pendingRes.error.message ?? 'Could not verify existing requests.');
      }

      const res = await submitMemberRequestFlow(
        secureClient,
        {
          actingUserId: createUserId(user!.id),
          personId,
          requestType,
          targetOrganisationId: selectedOrg.id,
          targetOrganisationName: selectedOrg.displayName,
          membershipTypeId: typeId,
          sourceOrganisationId:
            requestType === 'transfer' && sourceOrgId
              ? createOrganisationId(sourceOrgId)
              : null,
          formValues,
          orgSignupForm,
          existingMemberships,
          personDob,
          personForProgress: progressInput.person,
          memberForProgress: progressInput.member,
        },
        pendingRes.data
      );

      if (!isOk(res)) {
        const failure = asPreSubmitFailure(res.error);
        if (failure) {
          throw Object.assign(new Error(preSubmitFailureMessage(failure.code)), {
            preSubmit: true,
            preSubmitCode: failure.code,
          });
        }
        throw new Error(res.error.message ?? 'Could not submit request.');
      }
      return res.data;
    },
  });

  const submitRequest = useCallback(
    async (formValues: Record<string, unknown> | null) => {
      setPreSubmitError(null);
      setPreSubmitCode(null);
      setSubmitError(null);
      try {
        const result = await submitMutation.mutateAsync(formValues);
        setConfirmationOrgName(result.submittedOrgName);
        setFlowStep('confirmation');
        onSubmitted(result.listItem);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not submit request.';
        const errObj = e as Error & { preSubmit?: boolean; preSubmitCode?: MemberRequestPreSubmitFailureCode };
        if (errObj.preSubmit) {
          setPreSubmitError(msg);
          setPreSubmitCode(errObj.preSubmitCode ?? null);
        } else {
          setSubmitError(msg);
        }
      }
    },
    [submitMutation, onSubmitted]
  );

  return {
    flowStep,
    requestType,
    setRequestType,
    orgSearchQuery,
    setOrgSearchQuery,
    orgSearchResults: visibleOrgSearchResults,
    orgSearchLoading,
    orgSearchError,
    selectedOrg,
    selectOrg,
    sourceOrgId,
    setSourceOrgId,
    membershipTypes,
    eligibleMembershipTypes,
    selectedMembershipTypeId,
    setSelectedMembershipTypeId,
    orgSignupForm,
    orgFormLoading,
    preSubmitError,
    preSubmitCode,
    submitError,
    submitPending: submitMutation.isPending,
    confirmationOrgName,
    startFlow,
    cancelFlow,
    goNext,
    goBack,
    submitRequest,
    activeSourceMemberships,
  };
}
