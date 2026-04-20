import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdditionalContactsList } from '@/components/contacts/AdditionalContacts/AdditionalContactsList';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

function buildContact(overrides?: Partial<GroupedAdditionalContact>): GroupedAdditionalContact {
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
    phones: [
      { phone_number: '0412 345 678', phone_type: 'Mobile' },
      { phone_number: '0499 000 000', phone_type: '' },
    ],
    ...overrides,
  };
}

describe('AdditionalContactsList', () => {
  it('renders relationship and permission badges plus prefixed email and phone lines', () => {
    render(
      <AdditionalContactsList
        contacts={[buildContact()]}
        onEdit={vi.fn()}
        onDelete={vi.fn(async () => {})}
        isDeletePending={false}
        deleteError={null}
        onDeleteDialogClose={vi.fn()}
      />
    );

    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.getByText('view')).toBeInTheDocument();
    expect(screen.getByText('Email: jess@example.com')).toBeInTheDocument();
    expect(screen.getByText('Mobile: 0412 345 678')).toBeInTheDocument();
    expect(screen.getByText('Phone: 0499 000 000')).toBeInTheDocument();
  });

  it('calls onEdit for selected contact', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <AdditionalContactsList
        contacts={[buildContact()]}
        onEdit={onEdit}
        onDelete={vi.fn(async () => {})}
        isDeletePending={false}
        deleteError={null}
        onDeleteDialogClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(onEdit).toHaveBeenCalledWith('c1');
  });

  it('opens delete dialog and closes via cancel', async () => {
    const user = userEvent.setup();
    const onDeleteDialogClose = vi.fn();

    render(
      <AdditionalContactsList
        contacts={[buildContact()]}
        onEdit={vi.fn()}
        onDelete={vi.fn(async () => {})}
        isDeletePending={false}
        deleteError={null}
        onDeleteDialogClose={onDeleteDialogClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByRole('heading', { name: /delete contact/i })).toBeInTheDocument();
    expect(screen.getByText(/remove jessica rutherford from the list/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onDeleteDialogClose).toHaveBeenCalledOnce();
  });

  it('calls onDelete and closes dialog on successful delete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {});
    const onDeleteDialogClose = vi.fn();

    render(
      <AdditionalContactsList
        contacts={[buildContact()]}
        onEdit={vi.fn()}
        onDelete={onDelete}
        isDeletePending={false}
        deleteError={null}
        onDeleteDialogClose={onDeleteDialogClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /delete contact/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('c1');
      expect(onDeleteDialogClose).toHaveBeenCalledOnce();
    });
  });

  it('surfaces delete error and keeps dialog open on failed delete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {
      throw new Error('delete failed');
    });
    const onDeleteDialogClose = vi.fn();

    render(
      <AdditionalContactsList
        contacts={[buildContact()]}
        onEdit={vi.fn()}
        onDelete={onDelete}
        isDeletePending={false}
        deleteError="delete failed"
        onDeleteDialogClose={onDeleteDialogClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByText(/could not delete/i)).toBeInTheDocument();
    expect(screen.getByText(/delete failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete contact/i }));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('c1');
    });
    expect(onDeleteDialogClose).not.toHaveBeenCalled();
  });
});
