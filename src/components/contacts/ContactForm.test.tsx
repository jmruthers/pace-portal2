import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@solvera/pace-core/components';
import { ContactForm } from '@/components/contacts/ContactForm';
import type { UseContactFormStateResult } from '@/hooks/contacts/useContactFormState';

const stateMock = vi.fn();
const referencesMock = vi.fn();
const findByEmailMock = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/shared/lib/utils/userUtils', () => ({
  fetchCurrentPersonMember: vi.fn(async () => ({
    ok: true,
    data: { member: { id: 'm-self' } },
  })),
}));

vi.mock('@/hooks/contacts/useContactFormState', () => ({
  useContactFormState: () => stateMock(),
}));

vi.mock('@/hooks/contacts/useContactFormData', () => ({
  useContactFormReferenceData: () => referencesMock(),
  useContactPersonLookup: () => ({ findByEmail: findByEmailMock }),
}));

vi.mock('@/hooks/contacts/useContactOperations', () => ({
  useContactOperations: () => ({
    createContact: {
      mutateAsync: createMutateAsync,
      isPending: false,
    },
    updateContact: {
      mutateAsync: updateMutateAsync,
      isPending: false,
    },
    deleteContact: {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    },
  }),
}));

vi.mock('@/components/contacts/ContactForm/EmailFormStep', () => ({
  EmailFormStep: ({ onSubmit }: { onSubmit: (value: { email: string; no_email: boolean }) => void }) => (
    <Button type="button" variant="secondary" onClick={() => onSubmit({ email: 'sam@example.com', no_email: false })}>
      Email step submit
    </Button>
  ),
}));

vi.mock('@/components/contacts/ContactForm/MatchConfirmationStep', () => ({
  MatchConfirmationStep: ({ onLinkExisting }: { onLinkExisting: () => void }) => (
    <Button type="button" variant="secondary" onClick={onLinkExisting}>
      Match link existing
    </Button>
  ),
}));

vi.mock('@/components/contacts/ContactForm/RelationshipFormStep', () => ({
  RelationshipFormStep: ({ onSubmit }: { onSubmit: (value: { contact_type_id: string; permission_type: string }) => void }) => (
    <Button type="button" variant="secondary" onClick={() => onSubmit({ contact_type_id: 'ct-1', permission_type: 'view' })}>
      Relationship submit
    </Button>
  ),
}));

vi.mock('@/components/contacts/ContactForm/FullFormStep', () => ({
  FullFormStep: ({
    onSubmit,
  }: {
    onSubmit: (value: {
      first_name: string;
      last_name: string;
      preferred_name: string;
      email: string;
      phone_number: string;
      phone_type_id: number | null;
      contact_type_id: string;
      permission_type: string;
    }) => void;
  }) => (
    <Button
      type="button"
      variant="secondary"
      onClick={() =>
        onSubmit({
          first_name: 'Sam',
          last_name: 'Lee',
          preferred_name: '',
          email: 'sam@example.com',
          phone_number: '0400',
          phone_type_id: 1,
          contact_type_id: 'ct-1',
          permission_type: 'view',
        })
      }
    >
      Full form submit
    </Button>
  ),
}));

function buildBaseState(step: UseContactFormStateResult['step']): UseContactFormStateResult {
  return {
    step,
    draft: {
      first_name: 'Sam',
      last_name: 'Lee',
      preferred_name: '',
      email: 'sam@example.com',
      phone_number: '',
      phone_type_id: null,
      contact_type_id: 'ct-1',
      permission_type: 'view',
      match_person_id: null,
      link_existing_person: false,
    },
    matchedPerson: null,
    blockedMessage: null,
    setBlocked: vi.fn(),
    clearBlocked: vi.fn(),
    setMatchedPerson: vi.fn(),
    chooseLinkExistingPerson: vi.fn(),
    chooseCreateNewFromMatch: vi.fn(),
    applyRelationship: vi.fn(),
    applyFullValues: vi.fn(),
    setCreatePathNoEmail: vi.fn(),
    setCreatePathHasEmail: vi.fn(),
    toEmailStep: vi.fn(),
    toMatchStep: vi.fn(),
    toRelationshipStep: vi.fn(),
    toFullStep: vi.fn(),
  };
}

describe('ContactForm', () => {
  beforeEach(() => {
    stateMock.mockReset();
    referencesMock.mockReset();
    findByEmailMock.mockReset();
    findByEmailMock.mockResolvedValue({ ok: true, data: null });
    createMutateAsync.mockReset();
    updateMutateAsync.mockReset();
    referencesMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      data: {
        contactTypes: [{ id: 'ct-1', name: 'Emergency' }],
        phoneTypes: [{ id: 1, name: 'Mobile' }],
      },
    });
  });

  it('shows loading state while references are loading', () => {
    referencesMock.mockReturnValue({
      isLoading: true,
      isFetching: false,
      isError: false,
      error: null,
      data: undefined,
    });
    stateMock.mockReturnValue(buildBaseState('email'));
    render(
      <ContactForm
        mode="create"
        contacts={[]}
        initialContact={null}
        memberId={null}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
        onEditExistingContact={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/contact form loading/i)).toBeInTheDocument();
  });

  it('moves to relationship path when email has no existing match', async () => {
    const user = userEvent.setup();
    const state = buildBaseState('email');
    stateMock.mockReturnValue(state);
    findByEmailMock.mockResolvedValue({ ok: true, data: null });

    render(
      <ContactForm
        mode="create"
        contacts={[]}
        initialContact={null}
        memberId={null}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
        onEditExistingContact={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /email step submit/i }));
    expect(state.toRelationshipStep).toHaveBeenCalledOnce();
  });

  it('saves create flow from full step', async () => {
    const user = userEvent.setup();
    stateMock.mockReturnValue(buildBaseState('full'));
    const onSaved = vi.fn();

    render(
      <ContactForm
        mode="create"
        contacts={[]}
        initialContact={null}
        memberId="m1"
        onCancel={vi.fn()}
        onSaved={onSaved}
        onEditExistingContact={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /full form submit/i }));
    expect(createMutateAsync).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('saves edit flow from full step', async () => {
    const user = userEvent.setup();
    stateMock.mockReturnValue(buildBaseState('full'));
    const onSaved = vi.fn();

    render(
      <ContactForm
        mode="edit"
        contacts={[]}
        initialContact={{
          contact_id: 'c1',
          contact_person_id: 'p1',
          contact_type_id: 'ct-1',
          contact_type_name: 'Emergency',
          email: 'sam@example.com',
          first_name: 'Sam',
          last_name: 'Lee',
          member_id: 'm1',
          organisation_id: 'org-1',
          permission_type: 'view',
          phones: [{ phone_number: '0400', phone_type: 'Mobile' }],
        }}
        memberId={null}
        onCancel={vi.fn()}
        onSaved={onSaved}
        onEditExistingContact={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /full form submit/i }));
    expect(updateMutateAsync).toHaveBeenCalledOnce();
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: undefined,
        phoneTypeId: undefined,
      })
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });
});
