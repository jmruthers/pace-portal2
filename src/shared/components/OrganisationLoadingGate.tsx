import { Outlet } from 'react-router-dom';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { Alert, AlertDescription, AlertTitle, LoadingSpinner } from '@solvera/pace-core/components';

/**
 * Blocks protected surfaces until organisation context has finished initial load when signed in.
 */
export function OrganisationLoadingGate() {
  const { isAuthenticated, organisationLoading, hasValidOrganisationContext } = useUnifiedAuth();

  if (isAuthenticated && organisationLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-4" aria-busy="true">
        <section className="grid place-items-center gap-4">
          <LoadingSpinner label="Loading organisation context…" />
        </section>
      </main>
    );
  }

  if (isAuthenticated && !hasValidOrganisationContext) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Organisation required</h1>
        <Alert variant="destructive">
          <AlertTitle>No organisation access</AlertTitle>
          <AlertDescription>
            Select an organisation from the header, or sign in with an account that has portal access
            for this app. If you expect access, contact your administrator.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return <Outlet />;
}
