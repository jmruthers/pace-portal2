import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';

export function AdditionalContactsPage() {
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('targetMemberId');
  const { setProxyTargetMemberId } = useProxyMode();

  useEffect(() => {
    if (targetMemberId) {
      setProxyTargetMemberId(targetMemberId);
    }
  }, [targetMemberId, setProxyTargetMemberId]);

  return (
    <PagePermissionGuard pageName="additional-contacts" operation="read">
      <section aria-label="Additional contacts">
        {targetMemberId ? <ProxyModeBanner /> : null}
        <h1>Additional contacts</h1>
        <p>Contacts listing will be implemented in PR12–PR13.</p>
      </section>
    </PagePermissionGuard>
  );
}
