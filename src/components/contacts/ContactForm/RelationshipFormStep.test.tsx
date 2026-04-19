import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelationshipFormStep } from '@/components/contacts/ContactForm/RelationshipFormStep';

describe('RelationshipFormStep', () => {
  it('submits default relationship values and supports back/cancel', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <RelationshipFormStep
        contactTypes={[{ id: 'ct-1', name: 'Emergency' }]}
        permissionOptions={['view', 'edit']}
        defaultValues={{ contact_type_id: 'ct-1', permission_type: 'view' }}
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
