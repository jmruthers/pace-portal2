import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  renderShellInactivityWarning,
  SHELL_IDLE_TIMEOUT_MS,
  SHELL_WARN_BEFORE_MS,
} from '@/appShellAuthConfig';

vi.mock('@solvera/pace-core/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/components')>();
  return {
    ...actual,
    InactivityWarningModal: ({
      isOpen,
      timeRemaining,
    }: {
      isOpen: boolean;
      timeRemaining: number;
      onStaySignedIn: () => void;
      onSignOutNow: () => void;
    }) => (
      <div
        role="dialog"
        aria-label="Inactivity warning"
        data-open={String(isOpen)}
        data-remaining={String(timeRemaining)}
      />
    ),
  };
});

describe('appShellAuthConfig', () => {
  it('exports PR01 idle and warning durations', () => {
    expect(SHELL_IDLE_TIMEOUT_MS).toBe(15 * 60 * 1000);
    expect(SHELL_WARN_BEFORE_MS).toBe(2 * 60 * 1000);
    expect(SHELL_WARN_BEFORE_MS).toBeLessThan(SHELL_IDLE_TIMEOUT_MS);
  });

  it('renderShellInactivityWarning renders InactivityWarningModal', () => {
    const onStaySignedIn = vi.fn();
    const onSignOutNow = vi.fn();
    render(
      renderShellInactivityWarning({
        timeRemaining: 90_000,
        onStaySignedIn,
        onSignOutNow,
      })
    );
    expect(screen.getByRole('dialog', { name: 'Inactivity warning' })).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('dialog', { name: 'Inactivity warning' })).toHaveAttribute(
      'data-remaining',
      '90000'
    );
  });
});
