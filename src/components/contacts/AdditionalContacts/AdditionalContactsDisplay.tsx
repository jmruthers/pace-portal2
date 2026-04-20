import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import type { UseMutationResult } from '@tanstack/react-query';
import { AdditionalContactsList } from '@/components/contacts/AdditionalContacts/AdditionalContactsList';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

export type AdditionalContactsDisplayProps = {
  organisationId: string | null;
  contacts: GroupedAdditionalContact[];
  isLoading: boolean;
  isError: boolean;
  loadError: string | null;
  isProxyResolving: boolean;
  proxyValidationError: string | null;
  onAddContact: () => void;
  onEditContact: (contactId: string) => void;
  deleteContact: UseMutationResult<void, Error, string>;
};

/**
 * Additional contacts page body: loading, empty, list, delete, and add-contact CTA (PR12).
 */
export function AdditionalContactsDisplay({
  organisationId,
  contacts,
  isLoading,
  isError,
  loadError,
  isProxyResolving,
  proxyValidationError,
  onAddContact,
  onEditContact,
  deleteContact,
}: AdditionalContactsDisplayProps) {
  if (!organisationId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Organisation required</AlertTitle>
        <AlertDescription>Select an organisation before managing additional contacts.</AlertDescription>
      </Alert>
    );
  }

  if (proxyValidationError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Delegated access</AlertTitle>
        <AlertDescription>{proxyValidationError}</AlertDescription>
      </Alert>
    );
  }

  if (isProxyResolving) {
    return (
      <section
        className="grid min-h-[40vh] place-items-center"
        aria-busy="true"
        aria-label="Delegated contacts loading"
      >
        <LoadingSpinner label="Checking delegated access…" />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="grid min-h-[40vh] place-items-center" aria-busy="true" aria-label="Contacts loading">
        <LoadingSpinner label="Loading contacts…" />
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load contacts</AlertTitle>
        <AlertDescription>{loadError ?? 'Something went wrong.'}</AlertDescription>
      </Alert>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No additional contacts yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Add someone we can reach besides you for emergencies and updates.</p>
        </CardContent>
        <CardFooter className="text-right">
          <Button type="button" variant="default" onClick={onAddContact}>
            Add contact
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Additional contacts content">
      <header className="text-right">
        <Button type="button" variant="default" onClick={onAddContact}>
          Add contact
        </Button>
      </header>
      <AdditionalContactsList
        contacts={contacts}
        onEdit={onEditContact}
        onDelete={(id) => deleteContact.mutateAsync(id)}
        isDeletePending={deleteContact.isPending}
        deleteError={
          deleteContact.isError && deleteContact.error instanceof Error
            ? deleteContact.error.message
            : null
        }
        onDeleteDialogClose={() => {
          deleteContact.reset();
        }}
      />
    </section>
  );
}
