import { PagePermissionGuard } from '@solvera/pace-core/rbac';

/**
 * Profile completion wizard shell (PR05–PR06); PR01 routes only.
 */
export function ProfileCompletionWizardPage() {
  return (
    <PagePermissionGuard pageName="profile-complete" operation="read">
      <section aria-label="Profile completion">
        <h1>Complete your profile</h1>
        <p>Wizard steps will be added in later slices.</p>
      </section>
    </PagePermissionGuard>
  );
}
