import type { OrganisationId, UserId } from '@solvera/pace-core/types';
import type {
  MembershipListItem,
  OrgSignupFormReady,
  TeamMemberRequestType,
} from '@/lib/memberRequestTypes';

export type SubmitMemberRequestFlowInput = {
  actingUserId: UserId;
  personId: string;
  requestType: TeamMemberRequestType;
  targetOrganisationId: OrganisationId;
  targetOrganisationName: string;
  membershipTypeId: number;
  sourceOrganisationId: OrganisationId | null;
  formValues: Record<string, unknown> | null;
  orgSignupForm: OrgSignupFormReady | null;
  existingMemberships: MembershipListItem[];
  personDob: string | null;
  personForProgress: import('@/shared/lib/profileProgress').ProfileProgressTracked['person'];
  memberForProgress: import('@/shared/lib/profileProgress').ProfileProgressTracked['member'];
};

export type SubmitMemberRequestFlowResult = {
  submittedOrgName: string;
  listItem: MembershipListItem;
};
