import { PagePermissionGuard } from '@solvera/pace-core/rbac';

export function MedicalProfilePage() {
  return (
    <PagePermissionGuard pageName="medical-profile" operation="read">
      <section aria-label="Medical profile">
        <h1>Medical profile</h1>
        <p>Medical profile features will be implemented in PR09–PR11.</p>
      </section>
    </PagePermissionGuard>
  );
}
