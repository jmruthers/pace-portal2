import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberRequestOrgFormStep } from '@/components/memberships/MemberRequestOrgFormStep';

vi.mock('@/hooks/events/useFormFieldData', () => ({
  useFormFieldData: () => ({
    fieldMetas: [],
    fieldDefaults: {},
    prefillWarning: null,
    isLoading: false,
    fetchErrorMessage: null,
  }),
}));

vi.mock('@/components/events/FormRenderer', () => ({
  FormRenderer: () => <p>Form renderer</p>,
}));

describe('MemberRequestOrgFormStep (PR22 org signup step)', () => {
  const baseProps = {
    organisationId: 'org-1',
    organisationName: 'Test Org',
    personId: 'p1',
    memberId: null,
    personFirstName: 'Alex',
    personLastName: 'Member',
    personEmail: 'alex@example.com',
    orgSignupForm: null,
    submitPending: false,
    submitError: null,
    preSubmitError: null,
    onSubmit: vi.fn(),
  };

  it('shows review copy when org has no signup form fields', () => {
    render(<MemberRequestOrgFormStep {...baseProps} />);
    expect(screen.getByRole('heading', { name: /review and submit/i })).toBeInTheDocument();
    expect(screen.getByText(/Test Org/)).toBeInTheDocument();
    expect(screen.getByText(/no additional form fields/i)).toBeInTheDocument();
    expect(screen.queryByText('Form renderer')).not.toBeInTheDocument();
  });

  it('surfaces pre-submit and submit errors on review-only path', () => {
    render(
      <MemberRequestOrgFormStep
        {...baseProps}
        preSubmitError="Complete your profile first."
        submitError="Submit failed."
      />
    );
    expect(screen.getByText(/Complete your profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit failed/i)).toBeInTheDocument();
  });
});
