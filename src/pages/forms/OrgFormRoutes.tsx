import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NotFoundPage } from '@/pages/NotFoundPage';

const FormJourneyShell = lazy(async () => {
  const m = await import('@/components/form-journey/FormJourneyShell');
  return { default: m.FormJourneyShell };
});

/** PR17 authenticated `/forms/:formSlug` org-scoped form journey (RBAC here; event routes guard in FormFillPage). */
export function OrgFormRoute() {
  const { formSlug = '' } = useParams();
  if (formSlug.trim() === '') {
    return <NotFoundPage />;
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
      <Suspense
        fallback={
          <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
            <LoadingSpinner label="Loading form…" />
          </main>
        }
      >
        <FormJourneyShell entrypoint={{ kind: 'org_form', formSlug }} />
      </Suspense>
    </PagePermissionGuard>
  );
}
