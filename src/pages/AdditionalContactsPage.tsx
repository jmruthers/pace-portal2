import { PagePermissionGuard } from '@solvera/pace-core/rbac';

export function AdditionalContactsPage() {
  return (
    <PagePermissionGuard pageName="additional-contacts" operation="read">
      <section aria-label="Additional contacts">
        <h1>Additional contacts</h1>
        <p>Contacts listing will be implemented in PR12–PR13.</p>
      </section>
    </PagePermissionGuard>
  );
}
