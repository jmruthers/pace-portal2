import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { EmailFormStep } from '@/components/contacts/ContactForm/EmailFormStep';

describe('EmailFormStep', () => {
  it('submits no-email branch and supports cancel', async () => {
    const user = setupUser();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <EmailFormStep
        defaultEmail="sam@example.com"
        isCheckingMatch={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: /continue without email/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
