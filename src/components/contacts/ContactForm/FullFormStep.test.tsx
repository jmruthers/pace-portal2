import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FullFormStep } from '@/components/contacts/ContactForm/FullFormStep';

describe('FullFormStep', () => {
  it('submits full-form defaults and supports back/cancel', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <FullFormStep
        mode="create"
        contactTypes={[{ id: 'ct-1', name: 'Emergency' }]}
        phoneTypes={[{ id: 1, name: 'Mobile' }]}
        permissionOptions={['view', 'edit']}
        defaultValues={{
          first_name: 'Sam',
          last_name: 'Lee',
          preferred_name: '',
          email: 'sam@example.com',
          phone_number: '0400',
          phone_type_id: 1,
          contact_type_id: 'ct-1',
          permission_type: 'view',
        }}
        canBack={true}
        isSaving={false}
        onBack={onBack}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /save contact/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
