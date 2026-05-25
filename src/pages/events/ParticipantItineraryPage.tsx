import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { ParticipantItineraryView } from '@/components/events/ParticipantItineraryView';

/** PR21 — Route shell for authenticated participant itinerary at `/:eventSlug/itinerary`. */
export function ParticipantItineraryPage() {
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
