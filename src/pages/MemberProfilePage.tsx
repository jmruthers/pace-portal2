import { PagePermissionGuard } from '@solvera/pace-core/rbac';

export function MemberProfilePage() {
  return (
    <PagePermissionGuard pageName="member-profile" operation="read">
      <section aria-label="Member profile">
        <h1>Member profile</h1>
        <p>Self-service member profile will be implemented in PR07.</p>
      </section>
    </PagePermissionGuard>
  );
}
