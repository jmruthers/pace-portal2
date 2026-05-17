import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormRenderer } from '@/components/events/FormRenderer';
import type { FormFieldMeta } from '@solvera/pace-core/forms';

const scheduleSaveDraft = vi.fn();

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => null,
}));

vi.mock('@/hooks/events/useFormAdditionalContactsPreview', () => ({
  useFormAdditionalContactsPreview: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/auth/usePhoneNumbers', () => ({
  usePhoneNumbers: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/hooks/medical-profile/useMedicalProfileData', () => ({
  useMedicalProfileData: () => ({ data: null, isLoading: false, isError: false }),
}));

function wrapper(client: QueryClient) {
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('FormRenderer', () => {
  beforeEach(() => {
    scheduleSaveDraft.mockClear();
  });

  it('renders zero-field message and disabled submit note', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <FormRenderer
        eventTitle="Camp"
        formTitle="Registration"
        formDescription={null}
        fieldMetas={[]}
        confirmationKeys={[]}
        personId="p1"
        memberId="m1"
        personFirstName="A"
        personLastName="B"
        personEmail="a@b.c"
        fieldDefaults={{}}
        draftValues={{}}
        prefillWarning={null}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={scheduleSaveDraft}
        isSavingDraft={false}
        saveDraftError={null}
      />,
      { wrapper: wrapper(qc) }
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Camp' })).toBeInTheDocument();
    expect(screen.getByText(/this form has no fields yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    expect(screen.getByText(/submission is not available/i)).toBeInTheDocument();
  });

  it('renders member_profile confirmation inside the form schema context', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <FormRenderer
        eventTitle="Camp"
        formTitle="Registration"
        formDescription={null}
        fieldMetas={[]}
        confirmationKeys={['member_profile']}
        personId="p1"
        memberId="m1"
        personFirstName="A"
        personLastName="B"
        personEmail="a@b.c"
        fieldDefaults={{}}
        draftValues={{}}
        prefillWarning={null}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={scheduleSaveDraft}
        isSavingDraft={false}
        saveDraftError={null}
      />,
      { wrapper: wrapper(qc) }
    );
    expect(screen.getByLabelText('Member profile confirmation')).toBeInTheDocument();
    expect(document.getElementById('confirm-member-profile')).toBeTruthy();
  });

  it('shows draft resume banner when draft values exist', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const meta: FormFieldMeta = {
      id: 'fld-1',
      fieldType: 'text',
      fieldKey: 'person.first_name',
      label: 'First',
      required: true,
      sortOrder: 1,
      validationRules: null,
      displayOptions: null,
    };
    render(
      <FormRenderer
        eventTitle="Camp"
        formTitle="Registration"
        formDescription={null}
        fieldMetas={[meta]}
        confirmationKeys={[]}
        personId="p1"
        memberId="m1"
        personFirstName="A"
        personLastName="B"
        personEmail="a@b.c"
        fieldDefaults={{}}
        draftValues={{ 'fld-1': 'restored' }}
        prefillWarning={null}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={scheduleSaveDraft}
        isSavingDraft={false}
        saveDraftError={null}
      />,
      { wrapper: wrapper(qc) }
    );
    expect(screen.getByText(/resuming your application/i)).toBeInTheDocument();
  });

  it('surfaces unsupported field types as an alert without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const meta: FormFieldMeta = {
      id: 'fld-x',
      fieldType: 'unsupported_type_xyz',
      fieldKey: 'custom.field',
      label: 'Weird',
      required: false,
      sortOrder: 1,
      validationRules: null,
      displayOptions: null,
    };
    render(
      <FormRenderer
        eventTitle="Camp"
        formTitle="Registration"
        formDescription={null}
        fieldMetas={[meta]}
        confirmationKeys={[]}
        personId="p1"
        memberId="m1"
        personFirstName="A"
        personLastName="B"
        personEmail="a@b.c"
        fieldDefaults={{}}
        draftValues={{}}
        prefillWarning={null}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={scheduleSaveDraft}
        isSavingDraft={false}
        saveDraftError={null}
      />,
      { wrapper: wrapper(qc) }
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows draft save error alert', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <FormRenderer
        eventTitle="Camp"
        formTitle="Registration"
        formDescription={null}
        fieldMetas={[]}
        confirmationKeys={[]}
        personId="p1"
        memberId="m1"
        personFirstName="A"
        personLastName="B"
        personEmail="a@b.c"
        fieldDefaults={{}}
        draftValues={{}}
        prefillWarning={null}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={scheduleSaveDraft}
        isSavingDraft={false}
        saveDraftError="Network dropped"
      />,
      { wrapper: wrapper(qc) }
    );
    expect(screen.getByText(/network dropped/i)).toBeInTheDocument();
  });
});
