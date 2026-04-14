import type { ReactNode } from 'react';
import { ErrorBoundary } from '@solvera/pace-core/components';

export interface AppErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Shell-level error boundary for route trees (PR01).
 */
export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={() => {
        // Hook for future logging (operations standard); keep non-throwing.
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
