import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@solvera/pace-core/components';
import { AdditionalContactsDisplay } from '@/components/contacts/AdditionalContacts/AdditionalContactsDisplay';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

const listSpy = vi.fn();

vi.mock('@/components/contacts/AdditionalContacts/AdditionalContactsList', () => ({
  AdditionalContactsList: (props: unknown) => {
    listSpy(props);
    const typedProps = props as {
      onEdit: (contactId: string) => void;
      onDelete: (contactId: string) => Promise<void>;
      onDeleteDialogClose: () => void;
    };
    return (
      <section aria-label="Mock additional contacts list">
        <Button type="button" variant="secondary" onClick={() => typedProps.onEdit('c1')}>
          Trigger list edit
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            void typedProps.onDelete('c1');
          }}
        >
          Trigger list delete
        </Button>
        <Button type="button" variant="ghost" onClick={typedProps.onDeleteDialogClose}>
          Trigger list dialog close
        </Button>
      </section>
    );
  },
}));

function makeContact(): GroupedAdditionalContact {
  return {
    contact_id: 'c1',
    contact_person_id: 'p1',
    contact_type_id: 'ct-1',
    contact_type_name: 'Family',
    email: 'jess@example.com',
    first_name: 'Jessica',
    last_name: 'Rutherford',
    member_id: 'm1',
    organisation_id: 'org-1',
    permission_type: 'view',
    phones: [{ phone_number: '0412 345 678', phone_type: 'Mobile' }],
  };
}

function makeDeleteMutation(overrides?: Partial<Record<string, unknown>>) {
  return {
    mutateAsync: vi.fn(async () => {}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  };
}

describe('AdditionalContactsDisplay', () => {
  it('shows organisation required when organisation context is missing', () => {
    render(
      <AdditionalContactsDisplay
        organisationId={null}
        contacts={[]}
        isLoading={false}
        isError={false}
        loadError={null}
        isProxyResolving={false}
        proxyValidationError={null}
        onAddContact={vi.fn()}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );
    expect(screen.getByText(/organisation required/i)).toBeInTheDocument();
  });

  it('shows proxy validation error when delegated access fails', () => {
    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[]}
        isLoading={false}
        isError={false}
        loadError={null}
        isProxyResolving={false}
        proxyValidationError="Proxy denied"
        onAddContact={vi.fn()}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );
    expect(screen.getByText(/proxy denied/i)).toBeInTheDocument();
  });

  it('shows delegated loading state', () => {
    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[]}
        isLoading={false}
        isError={false}
        loadError={null}
        isProxyResolving={true}
        proxyValidationError={null}
        onAddContact={vi.fn()}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );
    expect(screen.getByLabelText(/delegated contacts loading/i)).toBeInTheDocument();
  });

  it('shows generic loading state', () => {
    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[]}
        isLoading={true}
        isError={false}
        loadError={null}
        isProxyResolving={false}
        proxyValidationError={null}
        onAddContact={vi.fn()}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );
    expect(screen.getByLabelText(/contacts loading/i)).toBeInTheDocument();
  });

  it('shows load error state', () => {
    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[]}
        isLoading={false}
        isError={true}
        loadError="rpc failed"
        isProxyResolving={false}
        proxyValidationError={null}
        onAddContact={vi.fn()}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );
    expect(screen.getByText(/rpc failed/i)).toBeInTheDocument();
  });

  it('renders empty state and calls add contact CTA', async () => {
    const user = userEvent.setup();
    const onAddContact = vi.fn();
    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[]}
        isLoading={false}
        isError={false}
        loadError={null}
        isProxyResolving={false}
        proxyValidationError={null}
        onAddContact={onAddContact}
        onEditContact={vi.fn()}
        deleteContact={makeDeleteMutation() as never}
      />
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    expect(onAddContact).toHaveBeenCalledOnce();
  });

  it('passes list callbacks through and resets delete state on dialog close', async () => {
    const user = userEvent.setup();
    const onEditContact = vi.fn();
    const deleteMutateAsync = vi.fn(async () => {});
    const deleteReset = vi.fn();
    listSpy.mockReset();

    render(
      <AdditionalContactsDisplay
        organisationId="org-1"
        contacts={[makeContact()]}
        isLoading={false}
        isError={false}
        loadError={null}
        isProxyResolving={false}
        proxyValidationError={null}
        onAddContact={vi.fn()}
        onEditContact={onEditContact}
        deleteContact={makeDeleteMutation({
          mutateAsync: deleteMutateAsync,
          reset: deleteReset,
        }) as never}
      />
    );

    await user.click(screen.getByRole('button', { name: /trigger list edit/i }));
    expect(onEditContact).toHaveBeenCalledWith('c1');

    await user.click(screen.getByRole('button', { name: /trigger list delete/i }));
    expect(deleteMutateAsync).toHaveBeenCalledWith('c1');

    await user.click(screen.getByRole('button', { name: /trigger list dialog close/i }));
    expect(deleteReset).toHaveBeenCalledOnce();
  });
});
