import { useParams } from 'react-router-dom';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';

export function ProfileEditProxyPage() {
  const { memberId = '' } = useParams();

  return (
    <PagePermissionGuard pageName="member-profile" operation="read">
      <section aria-label="Delegated profile edit">
        <h1>Edit profile</h1>
        <p>Member: {memberId}</p>
        <p>Delegated editing will be implemented in PR08.</p>
      </section>
    </PagePermissionGuard>
  );
}
