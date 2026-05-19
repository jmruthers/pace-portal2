import { FormJourneyShell } from '@/components/form-journey/FormJourneyShell';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

export interface FormFillPageProps {
  eventSlug: string;
  /** `null` when opened via `/:eventSlug/application` (primary entrypoint). */
  formSlug: string | null;
}

/**
 * Authenticated event form fill (PR15): RBAC {@link PagePermissionGuard} stays on this module; shell is {@link FormJourneyShell} (PR17). Organisation `/forms/:formSlug` applies the same guard in `src/pages/forms/OrgFormRoutes.tsx`.
 */
export function FormFillPage({ eventSlug, formSlug }: FormFillPageProps) {
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
      <FormJourneyShell
        entrypoint={
          formSlug == null || formSlug.trim() === ''
            ? { kind: 'event_application', eventSlug }
            : { kind: 'event_form', eventSlug, formSlug }
        }
      />
    </PagePermissionGuard>
  );
}
