import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { AdditionalContactsDisplay } from '@/components/contacts/AdditionalContacts/AdditionalContactsDisplay';
import { ContactForm } from '@/components/contacts/ContactForm';
import { useAdditionalContactsData } from '@/hooks/contacts/useAdditionalContactsData';
import { useContactOperations } from '@/hooks/contacts/useContactOperations';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

function AdditionalContactsContent() {
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('targetMemberId');
  const { setProxyTargetMemberId, validationError } = useProxyMode();
  const [formSurface, setFormSurface] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedContact, setSelectedContact] = useState<GroupedAdditionalContact | null>(null);

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

      {formSurface !== 'list' ? (
        <ContactForm
          mode={formSurface === 'edit' ? 'edit' : 'create'}
          contacts={contactsState.contacts}
          initialContact={formSurface === 'edit' ? selectedContact : null}
          targetMemberId={contactsState.mode === 'proxy' ? targetMemberId : null}
          onCancel={() => {
            setSelectedContact(null);
            setFormSurface('list');
          }}
          onSaved={() => {
            contactsState.refetch();
            setSelectedContact(null);
            setFormSurface('list');
          }}
          onEditExistingContact={(contact) => {
            setSelectedContact(contact);
            setFormSurface('edit');
          }}
        />
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
          onEditContact={(contactId) => {
            const contact = contactsState.contacts.find((item) => item.contact_id === contactId) ?? null;
            if (!contact) return;
            setSelectedContact(contact);
            setFormSurface('edit');
          }}
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
