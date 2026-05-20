/**
 * PR22 — `app_submit_member_request` RPC bridge (TM01).
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import { mapMemberRequestRpcMessage } from '@/lib/memberRequestRules';
import type { SubmitMemberRequestRpcArgs } from '@/lib/memberRequestTypes';

export type SubmitMemberRequestRpcResult = {
  memberId?: string;
  requestId?: string;
  memberRequestId?: string;
};

function parseSubmitMemberRequestResult(data: unknown): ApiResult<SubmitMemberRequestRpcResult> {
  if (data == null) {
    return ok({});
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    return ok({
      memberId: o.member_id != null ? String(o.member_id) : o.memberId != null ? String(o.memberId) : undefined,
      requestId:
        o.request_id != null
          ? String(o.request_id)
          : o.requestId != null
            ? String(o.requestId)
            : undefined,
      memberRequestId:
        o.team_member_request_id != null
          ? String(o.team_member_request_id)
          : undefined,
    });
  }
  return ok({});
}

export async function submitMemberRequest(
  client: SupabaseClient<Database>,
  args: SubmitMemberRequestRpcArgs
): Promise<ApiResult<SubmitMemberRequestRpcResult>> {
  const requestType = args.requestType === 'transfer' ? 'transfer' : 'join';
  const targetOrg = args.targetOrganisationId?.trim() || args.organisationId.trim();

  const { data, error } = await client.rpc('app_submit_member_request', {
    p_organisation_id: targetOrg,
    p_request_type: requestType,
    p_membership_type_id: args.membershipTypeId ?? undefined,
    p_subject_person_id: args.subjectPersonId.trim(),
    p_subject_member_id: args.subjectMemberId ?? undefined,
    p_source_organisation_id: args.sourceOrganisationId?.trim() ?? undefined,
    p_target_organisation_id: targetOrg,
    p_applicant_member_number: undefined,
    p_reason: undefined,
    p_form_response_id: args.formResponseId ?? undefined,
  });

  if (error) {
    const mapped = mapMemberRequestRpcMessage(error.message ?? '');
    return err({
      code: mapped.code,
      message: mapped.participantMessage,
    });
  }

  return parseSubmitMemberRequestResult(data);
}
