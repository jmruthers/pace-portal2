import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { FullFormStep } from '@/components/contacts/ContactForm/FullFormStep';

describe('FullFormStep', () => {
  it('submits full-form defaults and supports back/cancel', async () => {
    const user = setupUser();
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <FullFormStep
        mode="create"
        contactTypes={[{ id: 'ct-1', name: 'Emergency' }]}
        phoneTypes={[{ id: 1, name: 'Mobile' }]}
        permissionOptions={[
          { value: 'full', label: 'Full access' },
          { value: 'notify', label: 'Notify only' },
          { value: 'none', label: 'No access' },
        ]}
        defaultValues={{
          first_name: 'Sam',
          last_name: 'Lee',
          preferred_name: '',
          email: 'sam@example.com',
          phone_number: '0400',
          phone_type_id: 1,
          contact_type_id: 'ct-1',
          permission_type: 'full',
        }}
        canBack={true}
        isLinkExistingPerson={false}
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
