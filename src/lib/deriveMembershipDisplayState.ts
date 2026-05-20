import type {
  MembershipDisplayKind,
  PaceMembershipStatus,
  TeamMemberRequestStatus,
} from '@/lib/memberRequestTypes';

export type DeriveMembershipDisplayInput = {
  membershipStatus: PaceMembershipStatus | string | null;
  requestStatus: TeamMemberRequestStatus | string | null;
};

export type DeriveMembershipDisplayResult = {
  displayKind: MembershipDisplayKind;
  displayLabel: string;
  showApplyAgain: boolean;
};

const TERMINAL_LABELS: Record<string, string> = {
  Suspended: 'Suspended',
  Lapsed: 'Lapsed',
  Resigned: 'Resigned',
  Revoked: 'Revoked',
};

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/**
 * PR22 — Maps `core_member.membership_status` + `team_member_request.status` to participant card state.
 */
export function deriveMembershipDisplayState(
  input: DeriveMembershipDisplayInput
): DeriveMembershipDisplayResult {
  const ms = normalizeStatus(input.membershipStatus);
  const rs = normalizeStatus(input.requestStatus);

  if (ms === 'Active') {
    return { displayKind: 'active', displayLabel: 'Active', showApplyAgain: false };
  }

  if (ms === 'Declined' || (ms === 'Provisional' && rs === 'rejected')) {
    return { displayKind: 'not_approved', displayLabel: 'Not approved', showApplyAgain: true };
  }

  if (ms === 'Provisional' && rs === 'pending') {
    return {
      displayKind: 'awaiting_approval',
      displayLabel: 'Awaiting approval',
      showApplyAgain: false,
    };
  }

  if (ms === 'Provisional' && rs === 'on_hold') {
    return { displayKind: 'under_review', displayLabel: 'Under review', showApplyAgain: false };
  }

  if (ms === 'Provisional' && (rs === '' || rs === 'withdrawn' || rs === 'approved')) {
    return {
      displayKind: 'awaiting_approval',
      displayLabel: 'Awaiting approval',
      showApplyAgain: false,
    };
  }

  const terminalLabel = TERMINAL_LABELS[ms] ?? (ms || 'Membership');
  if (TERMINAL_LABELS[ms] != null || ['Suspended', 'Lapsed', 'Resigned', 'Revoked'].includes(ms)) {
    return {
      displayKind: 'terminal',
      displayLabel: terminalLabel,
      showApplyAgain: false,
    };
  }

  return {
    displayKind: 'terminal',
    displayLabel: ms || 'Membership',
    showApplyAgain: false,
  };
}
