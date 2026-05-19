import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, type UseFormReturn } from '@solvera/pace-core/forms';
import { useZodForm } from '@solvera/pace-core/hooks';
import type { GoogleMapsPreloadState } from '@/hooks/auth/useProfileCompletionWizard';
import {
  emptyMemberProfileFormValues,
  memberProfileWizardSchema,
  type MemberProfileFormValues,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';
import { MemberProfileWizardSteps } from '@/components/member-profile/MemberProfile/MemberProfileWizardSteps';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';

const addressFieldCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@solvera/pace-core/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/forms')>();
  return {
    ...actual,
    AddressField: (props: Record<string, unknown>) => {
      addressFieldCalls.push(props);
      return <div data-testid={`mock-address-${String(props.name)}`} />;
    },
  };
});

const refBundle: ReferenceDataBundle = {
  phoneTypes: [{ id: 1, name: 'Mobile', created_at: null, created_by: null, updated_at: null, updated_by: null }] as never,
  membershipTypes: [{ id: 1, name: 'Standard', created_at: null, created_by: null, updated_at: null, updated_by: null }] as never,
  genderTypes: [{ id: 1, name: 'Woman', created_at: null, created_by: null, updated_at: null, updated_by: null }] as never,
  pronounTypes: [{ id: 1, name: 'She/her', created_at: null, created_by: null, updated_at: null, updated_by: null }] as never,
};

const mapsUnavailable: GoogleMapsPreloadState = {
  phase: 'ready',
  result: { ok: true, data: { status: 'skipped', reason: 'no_api_key' } },
};

const mapsLoaded: GoogleMapsPreloadState = {
  phase: 'ready',
  result: { ok: true, data: { status: 'loaded' } },
};

function Harness(props: { step: number; mapsPreload?: GoogleMapsPreloadState }) {
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
        mapsPreload={props.mapsPreload ?? mapsUnavailable}
      />
    </FormProvider>
  );
}

describe('MemberProfileWizardSteps', () => {
  beforeEach(() => {
    addressFieldCalls.length = 0;
  });

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

  it('disables address search and country restriction when Maps is unavailable', () => {
    render(<Harness step={1} mapsPreload={mapsUnavailable} />);
    const residential = addressFieldCalls.find((p) => p.name === 'residential');
    expect(residential).toBeDefined();
    expect(residential?.showAddressSearch).toBe(false);
    expect(residential?.componentRestrictions).toBeUndefined();
  });

  it('enables address search with AU/NZ restriction when Maps provider is ready', () => {
    render(<Harness step={1} mapsPreload={mapsLoaded} />);
    const residential = addressFieldCalls.find((p) => p.name === 'residential');
    expect(residential?.showAddressSearch).toBe(true);
    expect(residential?.componentRestrictions).toEqual({ country: ['au', 'nz'] });
  });

  it('adds and removes extra phone rows', async () => {
    const user = userEvent.setup();
    render(<Harness step={1} />);
    const phoneGroup = screen.getByRole('group', { name: /phone numbers/i });
    expect(within(phoneGroup).getAllByRole('textbox')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /add another phone/i }));
    expect(within(phoneGroup).getAllByRole('textbox')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /^Remove phone number 2$/i }));
    expect(within(phoneGroup).getAllByRole('textbox')).toHaveLength(1);
  });
});
