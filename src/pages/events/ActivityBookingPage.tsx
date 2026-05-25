import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { ActivityBookingView } from '@/components/events/ActivityBookingView';

/** PR19 / BA10 — Route shell for authenticated participant activity booking. */
export function ActivityBookingPage() {
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
      <ActivityBookingView />
    </PagePermissionGuard>
  );
}
