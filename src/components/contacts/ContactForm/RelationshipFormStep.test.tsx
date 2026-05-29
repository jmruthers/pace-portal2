import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { RelationshipFormStep } from '@/components/contacts/ContactForm/RelationshipFormStep';

describe('RelationshipFormStep', () => {
  it('submits default relationship values and supports back/cancel', async () => {
    const user = setupUser();
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <RelationshipFormStep
        email="sam@example.com"
        contactTypes={[{ id: 'ct-1', name: 'Emergency' }]}
        permissionOptions={[
          { value: 'full', label: 'Full access' },
          { value: 'notify', label: 'Notify only' },
          { value: 'none', label: 'No access' },
        ]}
        defaultValues={{ contact_type_id: 'ct-1', permission_type: 'full' }}
        onBack={onBack}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
