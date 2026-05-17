import { InactivityWarningModal } from '@solvera/pace-core/components';

/** Idle timeout before forced logout (PR01). */
export const SHELL_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** Warning period before idle logout (PR01). */
export const SHELL_WARN_BEFORE_MS = 2 * 60 * 1000;

export type ShellInactivityWarningProps = {
  timeRemaining: number;
  onStaySignedIn: () => void;
  onSignOutNow: () => void;
};

/** Renders pace-core inactivity modal for {@link UnifiedAuthProvider.renderInactivityWarning}. */
export function renderShellInactivityWarning({
  timeRemaining,
  onStaySignedIn,
  onSignOutNow,
}: ShellInactivityWarningProps) {
  return (
    <InactivityWarningModal
      isOpen
      timeRemaining={timeRemaining}
      onStaySignedIn={onStaySignedIn}
      onSignOutNow={onSignOutNow}
    />
  );
}
