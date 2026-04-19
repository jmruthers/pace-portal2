import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactSummaryCard } from '@/components/contacts/ContactSummaryCard';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ appId: 'app-1' }),
}));

vi.mock('@/components/member-profile/ProfilePhotoUpload', () => ({
  ProfilePhotoUpload: () => <div data-testid="photo-upload" />,
}));

const person = {
  id: 'p1',
  first_name: 'Sam',
  last_name: 'Lee',
  email: 'sam@example.com',
  user_id: 'u1',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
  gender_id: null,
  pronoun_id: null,
  residential_address_id: null,
  postal_address_id: null,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

describe('ContactSummaryCard', () => {
  it('shows name, email, and phone summary', () => {
    render(<ContactSummaryCard person={person} phones={[]} organisationId="org-1" />);
    expect(screen.getByText(/Sam Lee/)).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByText(/no phone on file/i)).toBeInTheDocument();
  });

  it('summarises multiple phones', () => {
    render(
      <ContactSummaryCard
        person={person}
        phones={[{ id: 'ph1' } as never, { id: 'ph2' } as never]}
        organisationId={null}
      />
    );
    expect(screen.getByText(/2 phone number/i)).toBeInTheDocument();
  });

  it('hides profile photo upload when readOnly', () => {
    render(
      <ContactSummaryCard person={person} phones={[]} organisationId="org-1" readOnly />
    );
    expect(screen.queryByTestId('photo-upload')).not.toBeInTheDocument();
    expect(screen.getByText(/Sam Lee/)).toBeInTheDocument();
  });
});
