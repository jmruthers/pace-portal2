import type { OrganisationId } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

export type PaceMembershipStatus = Database['public']['Enums']['pace_membership_status'];
export type TeamMemberRequestStatus = Database['public']['Enums']['team_member_request_status'];
export type TeamMemberRequestType = 'join' | 'transfer';

export type MembershipDisplayKind =
  | 'awaiting_approval'
  | 'under_review'
  | 'active'
  | 'not_approved'
  | 'terminal';

export type JoinableOrganisation = {
  id: OrganisationId;
  name: string;
  displayName: string;
};

export type OrgMembershipTypeOption = {
  id: number;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  organisationId: OrganisationId;
};

export type MembershipListItem = {
  memberId: string;
  organisationId: OrganisationId;
  organisationName: string;
  membershipStatus: PaceMembershipStatus | string;
  membershipTypeId: number | null;
  membershipTypeName: string | null;
  membershipNumber: string | null;
  requestId: string | null;
  requestStatus: TeamMemberRequestStatus | null;
  requestSubmittedAt: string | null;
  displayKind: MembershipDisplayKind;
  displayLabel: string;
  showApplyAgain: boolean;
};

export type OrgSignupFormReady = {
  formId: string;
  formTitle: string;
  formDescription: string | null;
  fieldRows: CoreFormFieldRow[];
  confirmationKeys: string[];
};

export type SubmitMemberRequestRpcArgs = {
  organisationId: OrganisationId;
  requestType: TeamMemberRequestType;
  membershipTypeId: number | null;
  subjectPersonId: string;
  subjectMemberId: string | null;
  sourceOrganisationId: OrganisationId | null;
  targetOrganisationId: OrganisationId | null;
  formResponseId: string | null;
};
