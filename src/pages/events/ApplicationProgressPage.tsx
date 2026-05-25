import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { ApplicationProgressView } from '@/components/events/ApplicationProgressView';

/** PR18 / BA05b — Route shell for authenticated participant progress (data in {@link ApplicationProgressView}). */
export function ApplicationProgressPage() {
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
