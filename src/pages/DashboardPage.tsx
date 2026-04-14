import { PagePermissionGuard } from '@solvera/pace-core/rbac';

/**
 * Member dashboard composition surface (PR01 shell placeholder).
 */
export function DashboardPage() {
  return (
    <PagePermissionGuard pageName="dashboard" operation="read">
      <section aria-label="Dashboard">
        <h1>Dashboard</h1>
        <p>Member landing composition will be wired in PR03.</p>
      </section>
    </PagePermissionGuard>
  );
}
