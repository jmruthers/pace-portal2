import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { deriveMembershipDisplayState } from '@/lib/deriveMembershipDisplayState';
import { fetchOrgMembershipTypes } from '@/lib/fetchOrgMembershipTypes';
import { persistOrgSignupFormResponse } from '@/lib/persistOrgSignupFormResponse';
import { submitMemberRequest } from '@/lib/memberRequestRpc';
import type { MembershipListItem } from '@/lib/memberRequestTypes';
import type {
  SubmitMemberRequestFlowInput,
  SubmitMemberRequestFlowResult,
} from '@/lib/memberRequestFlowSubmitTypes';
import {
  asPreSubmitFailure,
  validateMemberRequestPreSubmit,
} from '@/lib/validateMemberRequestPreSubmit';
import { fetchPendingMemberRequests } from '@/lib/fetchMembershipList';

export async function submitMemberRequestFlow(
  client: SupabaseClient<Database>,
  input: SubmitMemberRequestFlowInput,
  pendingRequests: Array<{ targetOrganisationId: string; status: string }>
): Promise<ApiResult<SubmitMemberRequestFlowResult>> {
  const typesRes = await fetchOrgMembershipTypes(client, input.targetOrganisationId);
  if (!isOk(typesRes)) {
    return err(typesRes.error);
  }

  const guardRes = validateMemberRequestPreSubmit({
    requestType: input.requestType,
    sourceOrganisationId: input.sourceOrganisationId,
    targetOrganisationId: input.targetOrganisationId,
    membershipTypeId: input.membershipTypeId,
    membershipTypes: typesRes.data,
    personDob: input.personDob,
    progressInput: {
      person: input.personForProgress,
      member: input.memberForProgress,
    },
    existingMemberships: input.existingMemberships,
    pendingRequests,
  });

  if (!isOk(guardRes)) {
    const failure = asPreSubmitFailure(guardRes.error);
    return err({
      code: guardRes.error.code ?? 'MEMBER_REQUEST_GUARD',
      message: failure?.message ?? guardRes.error.message ?? 'Request blocked.',
    });
  }

  let formResponseId: string | null = null;
  if (input.orgSignupForm != null && input.formValues != null) {
    const persistRes = await persistOrgSignupFormResponse(client, {
      actingUserId: input.actingUserId,
      organisationId: input.targetOrganisationId,
      formId: input.orgSignupForm.formId,
      fieldRows: input.orgSignupForm.fieldRows,
      formValues: input.formValues,
    });
    if (!isOk(persistRes)) {
      return err(persistRes.error);
    }
    formResponseId = persistRes.data;
  }

  const sourceMember = input.existingMemberships.find(
    (m) => m.organisationId === input.sourceOrganisationId && m.membershipStatus === 'Active'
  );

  const rpcRes = await submitMemberRequest(client, {
    organisationId: input.targetOrganisationId,
    requestType: input.requestType,
    membershipTypeId: input.membershipTypeId,
    subjectPersonId: input.personId,
    subjectMemberId: sourceMember?.memberId ?? null,
    sourceOrganisationId: input.sourceOrganisationId,
    targetOrganisationId: input.targetOrganisationId,
    formResponseId,
  });

  if (!isOk(rpcRes)) {
    return err(rpcRes.error);
  }

  const derived = deriveMembershipDisplayState({
    membershipStatus: 'Provisional',
    requestStatus: 'pending',
  });

  const listItem: MembershipListItem = {
    memberId: rpcRes.data.memberId ?? `pending-${input.targetOrganisationId}`,
    organisationId: input.targetOrganisationId,
    organisationName: input.targetOrganisationName,
    membershipStatus: 'Provisional',
    membershipTypeId: input.membershipTypeId,
    membershipTypeName: typesRes.data.find((t) => t.id === input.membershipTypeId)?.name ?? null,
    membershipNumber: null,
    requestId: rpcRes.data.requestId ?? rpcRes.data.memberRequestId ?? null,
    requestStatus: 'pending',
    requestSubmittedAt: new Date().toISOString(),
    displayKind: derived.displayKind,
    displayLabel: derived.displayLabel,
    showApplyAgain: false,
  };

  return ok({
    submittedOrgName: input.targetOrganisationName,
    listItem,
  });
}

export async function loadPendingRequestsForGuard(
  client: SupabaseClient<Database>,
  personId: string
): Promise<ApiResult<Array<{ targetOrganisationId: string; status: string }>>> {
  return fetchPendingMemberRequests(client, personId);
}
