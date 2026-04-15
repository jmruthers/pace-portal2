import { Alert, AlertDescription, AlertTitle } from '@solvera/pace-core/components';
import { useProxyMode } from '@/shared/hooks/useProxyMode';

/**
 * Surfaces validated delegated (proxy) context on self-service routes — local storage alone is not authority.
 */
export function ProxyModeBanner() {
  const { isProxyActive, isValidating, validationError, targetMemberId } = useProxyMode();

  if (isValidating) {
    return (
      <Alert>
        <AlertTitle>Checking delegated access</AlertTitle>
        <AlertDescription>Please wait…</AlertDescription>
      </Alert>
    );
  }

  if (validationError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Delegated access</AlertTitle>
        <AlertDescription>{validationError}</AlertDescription>
      </Alert>
    );
  }

  if (!isProxyActive || !targetMemberId) {
    return null;
  }

  return (
    <Alert>
      <AlertTitle>Delegated viewing context</AlertTitle>
      <AlertDescription>
        You are viewing with a delegated member context. Editing here still applies to your own member record;
        full delegated editing uses the routes described in PR08.
      </AlertDescription>
    </Alert>
  );
}
