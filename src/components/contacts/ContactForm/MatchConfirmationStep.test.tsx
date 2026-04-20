import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchConfirmationStep } from '@/components/contacts/ContactForm/MatchConfirmationStep';

describe('MatchConfirmationStep', () => {
  it('calls actions from confirmation buttons', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onLinkExisting = vi.fn();
    const onCreateNew = vi.fn();

    render(
      <MatchConfirmationStep
        match={{
          person_id: 'p1',
          first_name: 'Sam',
          last_name: 'Lee',
          preferred_name: null,
          email: 'sam@example.com',
          phone_number: null,
          phone_type_id: null,
        }}
        onBack={onBack}
        onCancel={onCancel}
        onLinkExisting={onLinkExisting}
        onCreateNew={onCreateNew}
      />
    );

    await user.click(screen.getByRole('button', { name: /link existing person/i }));
    await user.click(screen.getByRole('button', { name: /create new contact/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onLinkExisting).toHaveBeenCalledOnce();
    expect(onCreateNew).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
