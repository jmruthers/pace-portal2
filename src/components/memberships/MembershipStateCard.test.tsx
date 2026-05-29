import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { createOrganisationId } from '@solvera/pace-core/types';
import { MembershipStateCard } from '@/components/memberships/MembershipStateCard';
import type { MembershipListItem } from '@/lib/memberRequestTypes';

const declinedItem: MembershipListItem = {
  memberId: 'm1',
  organisationId: createOrganisationId('org-a'),
  organisationName: 'Org A',
  membershipStatus: 'Declined',
  membershipTypeId: 1,
  membershipTypeName: 'Member',
  membershipNumber: null,
  requestId: 'req-1',
  requestStatus: 'rejected',
  requestSubmittedAt: '2026-05-01T00:00:00.000Z',
  displayKind: 'not_approved',
  displayLabel: 'Not approved',
  showApplyAgain: true,
};

describe('MembershipStateCard', () => {
  it('calls onApplyAgain with org id and name when Apply again is clicked', async () => {
    const user = setupUser();
    const onApplyAgain = vi.fn();

    render(<MembershipStateCard item={declinedItem} onApplyAgain={onApplyAgain} />);

    await user.click(screen.getByRole('button', { name: /apply again/i }));

    expect(onApplyAgain).toHaveBeenCalledWith('org-a', 'Org A');
  });

  it('shows submitted date for awaiting approval', () => {
    const pendingItem: MembershipListItem = {
      ...declinedItem,
      membershipStatus: 'Provisional',
      requestStatus: 'pending',
      displayKind: 'awaiting_approval',
      displayLabel: 'Awaiting approval',
      showApplyAgain: false,
      requestSubmittedAt: '2026-05-15T00:00:00.000Z',
    };

    render(<MembershipStateCard item={pendingItem} />);

    expect(screen.getByText(/awaiting approval/i)).toBeInTheDocument();
    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
  });
});
