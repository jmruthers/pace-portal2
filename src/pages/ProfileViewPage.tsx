import { useParams } from 'react-router-dom';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';

export function ProfileViewPage() {
  const { memberId = '' } = useParams();

  return (
    <PagePermissionGuard pageName="member-profile" operation="read">
      <section aria-label="Delegated profile view">
        <h1>View profile</h1>
        <p>Member: {memberId}</p>
        <p>Delegated viewing will be implemented in PR08.</p>
      </section>
    </PagePermissionGuard>
  );
}
