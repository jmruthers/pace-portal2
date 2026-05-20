import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { ParticipantItineraryView } from '@/components/events/ParticipantItineraryView';

/** PR21 — Route shell for authenticated participant itinerary at `/:eventSlug/itinerary`. */
export function ParticipantItineraryPage() {
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
        <h1>Itinerary</h1>
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
      <ParticipantItineraryView />
    </PagePermissionGuard>
  );
}
