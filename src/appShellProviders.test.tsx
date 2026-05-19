import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@solvera/pace-core/components';

describe('app shell providers (PR01)', () => {
  it('ToastProvider mounts children for global toasts', () => {
    render(
      <ToastProvider>
        <span data-testid="shell-child">Portal</span>
      </ToastProvider>
    );
    expect(screen.getByTestId('shell-child')).toBeInTheDocument();
  });
});
