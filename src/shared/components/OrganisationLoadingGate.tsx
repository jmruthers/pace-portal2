import { Outlet } from 'react-router-dom';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { LoadingSpinner } from '@solvera/pace-core/components';

/**
 * Blocks protected surfaces until organisation context has finished initial load when signed in.
 */
export function OrganisationLoadingGate() {
  const { isAuthenticated, organisationLoading } = useUnifiedAuth();

  if (isAuthenticated && organisationLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-4" aria-busy="true">
        <section className="grid place-items-center gap-4">
          <LoadingSpinner label="Loading organisation context…" />
        </section>
      </main>
    );
  }

  return <Outlet />;
}
