import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { MyMembershipsView } from '@/components/memberships/MyMembershipsView';

/** PR22 — Authenticated my memberships route shell. */
export function MyMembershipsPage() {
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
        <h1>My memberships</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="my-memberships"
      operation="read"
      loading={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <MyMembershipsView />
    </PagePermissionGuard>
  );
}
