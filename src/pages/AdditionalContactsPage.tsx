import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { AdditionalContactsDisplay } from '@/components/contacts/AdditionalContacts/AdditionalContactsDisplay';
import { useAdditionalContactsData } from '@/hooks/contacts/useAdditionalContactsData';
import { useContactOperations } from '@/hooks/contacts/useContactOperations';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';

function AdditionalContactsContent() {
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('targetMemberId');
  const { setProxyTargetMemberId, validationError } = useProxyMode();
  const [formSurface, setFormSurface] = useState<'list' | 'create'>('list');

  const contactsState = useAdditionalContactsData();
  const { deleteContact } = useContactOperations();

  useEffect(() => {
    if (targetMemberId) {
      setProxyTargetMemberId(targetMemberId);
    }
  }, [targetMemberId, setProxyTargetMemberId]);

  return (
    <section className="mx-auto grid max-w-(--app-width) gap-6 p-4" aria-label="Additional contacts">
      {targetMemberId ? <ProxyModeBanner /> : null}
      <h1>Additional contacts</h1>

      {formSurface === 'create' ? (
        <section className="grid gap-4" aria-label="Add contact handoff">
          <Alert>
            <AlertTitle>Add contact</AlertTitle>
            <AlertDescription>
              Contact matching, field details, and save are owned by PR13. This handoff preserves the list contract
              on this route until the inline form is wired.
            </AlertDescription>
          </Alert>
          <Button type="button" variant="secondary" onClick={() => setFormSurface('list')}>
            Back to contacts
          </Button>
        </section>
      ) : (
        <AdditionalContactsDisplay
          organisationId={contactsState.organisationId}
          contacts={contactsState.contacts}
          isLoading={contactsState.isLoading}
          isError={contactsState.isError}
          loadError={contactsState.error?.message ?? null}
          isProxyResolving={contactsState.isProxyResolving}
          proxyValidationError={validationError}
          onAddContact={() => setFormSurface('create')}
          deleteContact={deleteContact}
        />
      )}
    </section>
  );
}

/**
 * Member-facing additional contacts listing and management landing (PR12). Create/edit form: PR13.
 */
export function AdditionalContactsPage() {
  return (
    <PagePermissionGuard
      pageName="additional-contacts"
      operation="read"
      loading={
        <main className="grid min-h-[50vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <AdditionalContactsContent />
    </PagePermissionGuard>
  );
}
