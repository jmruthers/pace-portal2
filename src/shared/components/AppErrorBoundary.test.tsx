import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from '@/shared/components/AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AppErrorBoundary>
        <p>Inside</p>
      </AppErrorBoundary>
    );
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});
