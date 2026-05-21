import type {
  JoinableOrganisation,
  MembershipListItem,
  OrgMembershipTypeOption,
  OrgSignupFormReady,
  TeamMemberRequestType,
} from '@/lib/memberRequestTypes';

export type MemberRequestFlowStep =
  | 'idle'
  | 'request_type'
  | 'org_search'
  | 'source_org'
  | 'membership_type'
  | 'org_form'
  | 'confirmation';

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
