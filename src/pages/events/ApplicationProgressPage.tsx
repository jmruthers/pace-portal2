import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { ApplicationProgressView } from '@/components/events/ApplicationProgressView';

/** PR18 / BA05b — Route shell for authenticated participant progress (data in {@link ApplicationProgressView}). */
export function ApplicationProgressPage() {
  const { isAuthenticated } = useUnifiedAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>Application progress</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="dashboard"
      operation="read"
      loading={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <ApplicationProgressView />
    </PagePermissionGuard>
  );
}
