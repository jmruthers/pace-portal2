/* eslint-disable pace-core-compliance/max-named-exports -- PR22 shared contracts for list + flow + RPC. */
import type { OrganisationId, UserId } from '@solvera/pace-core/types';
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

export type MemberRequestFlowStep =
  | 'idle'
  | 'request_type'
  | 'org_search'
  | 'source_org'
  | 'membership_type'
  | 'org_form'
  | 'confirmation';

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

/** Options for {@link MemberRequestFlowControls.startFlow}. */
export type MemberRequestFlowStartOptions = {
  prefilledOrgId?: string;
  prefilledOrgName?: string;
};

/** Step navigation and flow lifecycle (PR22 ISP). */
export type MemberRequestFlowControls = {
  flowStep: MemberRequestFlowStep;
  confirmationOrgName: string | null;
  startFlow: (opts?: MemberRequestFlowStartOptions) => void;
  cancelFlow: () => void;
  goNext: () => void;
  goBack: () => void;
};

/** Join vs transfer selection (PR22 ISP). */
export type MemberRequestFlowRequestType = {
  requestType: TeamMemberRequestType;
  setRequestType: (t: TeamMemberRequestType) => void;
};

/** Org directory search and selection (PR22 ISP). */
export type MemberRequestFlowOrgSearch = {
  orgSearchQuery: string;
  setOrgSearchQuery: (q: string) => void;
  orgSearchResults: JoinableOrganisation[];
  orgSearchLoading: boolean;
  orgSearchError: string | null;
  selectedOrg: JoinableOrganisation | null;
  selectOrg: (org: JoinableOrganisation) => void;
};

/** Transfer source org selection (PR22 ISP). */
export type MemberRequestFlowTransfer = {
  sourceOrgId: string | null;
  setSourceOrgId: (id: string | null) => void;
  activeSourceMemberships: MembershipListItem[];
};

/** Membership type pick list (PR22 ISP). */
export type MemberRequestFlowMembershipType = {
  membershipTypes: OrgMembershipTypeOption[];
  eligibleMembershipTypes: OrgMembershipTypeOption[];
  selectedMembershipTypeId: number | null;
  setSelectedMembershipTypeId: (id: number | null) => void;
};

/** Org signup form load state (PR22 ISP). */
export type MemberRequestFlowOrgForm = {
  orgSignupForm: OrgSignupFormReady | null;
  orgFormLoading: boolean;
};

/** Pre-submit / RPC submit surface (PR22 ISP). */
export type MemberRequestFlowSubmit = {
  preSubmitError: string | null;
  preSubmitCode: import('@/lib/validateMemberRequestPreSubmit').MemberRequestPreSubmitFailureCode | null;
  submitError: string | null;
  submitPending: boolean;
  submitRequest: (formValues: Record<string, unknown> | null) => Promise<void>;
};

/** Full inline join/transfer flow API returned by `useMemberRequestFlow`. */
export type UseMemberRequestFlowResult =
  MemberRequestFlowControls &
  MemberRequestFlowRequestType &
  MemberRequestFlowOrgSearch &
  MemberRequestFlowTransfer &
  MemberRequestFlowMembershipType &
  MemberRequestFlowOrgForm &
  MemberRequestFlowSubmit;
