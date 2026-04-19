import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemberProfileForm } from '@/components/member-profile/MemberProfile/MemberProfileForm';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';
import type { MemberProfileFormValues } from '@/utils/member-profile/validation';

const defaultValues: MemberProfileFormValues = {
  first_name: 'A',
  last_name: 'B',
  middle_name: null,
  preferred_name: null,
  email: 'a@example.com',
  date_of_birth: '1990-01-01',
  gender_id: 1,
  pronoun_id: 1,
  residential: {
    line1: '1 Test St',
    locality: 'Sydney',
    countryCode: 'AU',
    placeId: 'place-1',
  },
  postal_same_as_residential: true,
  postal: null,
  membership_type_id: 1,
  membership_number: 'M1',
  membership_status: 'Active',
  phones: [{ phone_number: '0400000000', phone_type_id: 1 }],
};

const referenceBundle: ReferenceDataBundle = {
  phoneTypes: [{ id: 1, name: 'Mobile', created_at: null, updated_at: null, deleted_at: null }] as never,
  membershipTypes: [
    { id: 1, name: 'Standard', created_at: null, updated_at: null, deleted_at: null },
  ] as never,
  genderTypes: [{ id: 1, name: 'F', created_at: null, updated_at: null, deleted_at: null }] as never,
  pronounTypes: [{ id: 1, name: 'She', created_at: null, updated_at: null, deleted_at: null }] as never,
};

describe('MemberProfileForm', () => {
  it('renders sectioned profile fields', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemberProfileForm
          formKey="t1"
          defaultValues={defaultValues}
          referenceData={referenceBundle}
          addressProvider={null}
          isSubmitting={false}
          onSubmit={vi.fn()}
        />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Profile completion/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /personal information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add phone/i }));
    expect(screen.getAllByLabelText(/number/i).length).toBeGreaterThan(1);

    await user.click(screen.getByRole('checkbox', { name: /postal address same as residential/i }));
    expect(screen.getAllByRole('region', { name: /postal address/i }).length).toBeGreaterThan(0);
  });
});
