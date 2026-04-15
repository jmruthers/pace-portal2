import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, type UseFormReturn } from '@solvera/pace-core/forms';
import { useZodForm } from '@solvera/pace-core/hooks';
import {
  emptyMemberProfileFormValues,
  memberProfileWizardSchema,
  type MemberProfileFormValues,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import { MemberProfileWizardSteps } from '@/components/member-profile/MemberProfile/MemberProfileWizardSteps';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';

const refBundle: ReferenceDataBundle = {
  phoneTypes: [{ id: 1, name: 'Mobile', organisation_id: 'o', created_at: null, created_by: null, updated_at: null, updated_by: null }],
  membershipTypes: [
    { id: 1, name: 'Standard', organisation_id: 'o', is_active: true, created_at: null, created_by: null, updated_at: null, updated_by: null, min_age: null, max_age: null },
  ],
  genderTypes: [{ id: 1, name: 'Woman', organisation_id: 'o', created_at: null, created_by: null, updated_at: null, updated_by: null }],
  pronounTypes: [{ id: 1, name: 'She/her', organisation_id: 'o', created_at: null, created_by: null, updated_at: null, updated_by: null }],
};

function Harness(props: { step: number }) {
  const form = useZodForm({
    schema: memberProfileWizardSchema,
    defaultValues: {
      ...emptyMemberProfileFormValues(),
      first_name: 'A',
      last_name: 'B',
      email: 'a@example.com',
      date_of_birth: '1990-01-01',
      residential: { line1: '1 St', locality: 'Sydney', countryCode: 'AU' },
      phones: [{ phone_number: '0400', phone_type_id: null }],
    },
  });
  return (
    <FormProvider {...(form as unknown as UseFormReturn<MemberProfileFormValues>)}>
      <MemberProfileWizardSteps
        currentStep={props.step}
        referenceData={refBundle}
        mapsPreload={{ phase: 'ready', result: { ok: true, data: { status: 'skipped', reason: 'no_api_key' } } }}
      />
    </FormProvider>
  );
}

describe('MemberProfileWizardSteps', () => {
  it('renders personal fields on step 0', () => {
    render(<Harness step={0} />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
  });

  it('renders contact fields on step 1', () => {
    render(<Harness step={1} />);
    expect(screen.getByLabelText(/phone number 1/i)).toBeInTheDocument();
  });

  it('renders membership fields on step 2', () => {
    render(<Harness step={2} />);
    expect(screen.getByLabelText(/membership number/i)).toBeInTheDocument();
  });
});
