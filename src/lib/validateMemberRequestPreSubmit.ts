import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { OrganisationId } from '@solvera/pace-core/types';
import {
  computeProfileProgress,
  type ProfileProgressTracked,
} from '@/shared/lib/profileProgress';
import type {
  MembershipListItem,
  OrgMembershipTypeOption,
  TeamMemberRequestType,
} from '@/lib/memberRequestTypes';
import { filterMembershipTypesByAge } from '@/lib/fetchOrgMembershipTypes';

/** Aligned with {@link profileProgress.test.ts} “mostly complete” fixture. */
export const PROFILE_COMPLETENESS_THRESHOLD = 0.8;

export type MemberRequestPreSubmitFailureCode =
  | 'PROFILE_INCOMPLETE'
  | 'DUPLICATE_REQUEST'
  | 'AGE_INELIGIBLE'
  | 'TRANSFER_SOURCE_REQUIRED';

export type MemberRequestPreSubmitFailure = {
  code: MemberRequestPreSubmitFailureCode;
  message: string;
};

export type ValidateMemberRequestPreSubmitInput = {
  requestType?: TeamMemberRequestType;
  sourceOrganisationId?: OrganisationId | null;
  targetOrganisationId: OrganisationId;
  membershipTypeId: number;
  membershipTypes: OrgMembershipTypeOption[];
  personDob: string | null;
  progressInput: ProfileProgressTracked;
  existingMemberships: MembershipListItem[];
  pendingRequests: Array<{
    targetOrganisationId: string;
    status: string;
  }>;
};

export function validateMemberRequestPreSubmit(
  input: ValidateMemberRequestPreSubmitInput
): ApiResult<void> {
  if (input.requestType === 'transfer') {
    const sourceId = input.sourceOrganisationId?.trim() ?? '';
    if (!sourceId) {
      return err({
        code: 'TRANSFER_SOURCE_REQUIRED',
        message: 'Select the organisation you are leaving before submitting a transfer.',
      });
    }
    const hasActiveSource = input.existingMemberships.some(
      (m) => m.organisationId === sourceId && m.membershipStatus === 'Active'
    );
    if (!hasActiveSource) {
      return err({
        code: 'TRANSFER_SOURCE_REQUIRED',
        message: 'You need an active membership at the source organisation to transfer.',
      });
    }
  }

  const progress = computeProfileProgress(input.progressInput);
  if (progress.completionRatio < PROFILE_COMPLETENESS_THRESHOLD) {
    return err({
      code: 'PROFILE_INCOMPLETE',
      message: 'Complete your member profile before requesting to join an organisation.',
    });
  }

  const targetId = input.targetOrganisationId.trim();
  const duplicateFromList = input.existingMemberships.some(
    (m) =>
      m.organisationId === targetId &&
      m.requestStatus != null &&
      (m.requestStatus === 'pending' || m.requestStatus === 'on_hold')
  );
  const duplicateFromRequests = input.pendingRequests.some(
    (r) =>
      r.targetOrganisationId === targetId &&
      (r.status === 'pending' || r.status === 'on_hold')
  );
  if (duplicateFromList || duplicateFromRequests) {
    return err({
      code: 'DUPLICATE_REQUEST',
      message: 'You already have a pending or on-hold request for this organisation.',
    });
  }

  const eligible = filterMembershipTypesByAge(input.personDob, input.membershipTypes);
  if (!eligible.some((t) => t.id === input.membershipTypeId)) {
    return err({
      code: 'AGE_INELIGIBLE',
      message: 'The selected membership type is not available for your age.',
    });
  }

  return ok(undefined);
}

export function asPreSubmitFailure(
  error: { code?: string; message?: string } | undefined
): MemberRequestPreSubmitFailure | null {
  if (!error?.code) return null;
  const code = error.code as MemberRequestPreSubmitFailureCode;
  if (
    code === 'PROFILE_INCOMPLETE' ||
    code === 'DUPLICATE_REQUEST' ||
    code === 'AGE_INELIGIBLE' ||
    code === 'TRANSFER_SOURCE_REQUIRED'
  ) {
    return { code, message: error.message ?? '' };
  }
  return null;
}
