import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogPortal,
} from '@solvera/pace-core/components';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

export type AdditionalContactsListProps = {
  contacts: GroupedAdditionalContact[];
  onDelete: (contactId: string) => Promise<void>;
  isDeletePending: boolean;
  deleteError: string | null;
  onDeleteDialogClose: () => void;
};

/**
 * Card-based additional contacts list (PR12): phones and permission badges per contact.
 */
export function AdditionalContactsList({
  contacts,
  onDelete,
  isDeletePending,
  deleteError,
  onDeleteDialogClose,
}: AdditionalContactsListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const contactPendingDelete = contacts.find((c) => c.contact_id === confirmDeleteId);

  return (
    <>
      <ul className="grid gap-4" aria-label="Additional contacts list">
        {contacts.map((c) => (
          <li key={c.contact_id}>
            <Card>
              <CardHeader className="grid gap-2">
                <CardTitle>
                  {c.first_name} {c.last_name}
                </CardTitle>
                <Badge variant="outline-sec-normal">{c.permission_type}</Badge>
              </CardHeader>
              <CardContent className="grid gap-2">
                <p>{c.contact_type_name}</p>
                {c.email ? <p>{c.email}</p> : null}
                {c.phones.length > 0 ? (
                  <ul className="grid gap-1">
                    {c.phones.map((ph, idx) => (
                      <li key={`${c.contact_id}-ph-${idx}`}>
                        {ph.phone_type ? `${ph.phone_type}: ` : null}
                        {ph.phone_number}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
              <CardFooter className="text-right">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeletePending}
                  onClick={() => {
                    setConfirmDeleteId(c.contact_id);
                  }}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            onDeleteDialogClose();
          }
        }}
      >
        <DialogPortal>
          <DialogContent aria-labelledby="delete-contact-title">
            <DialogBody className="grid gap-4">
              <h2 id="delete-contact-title">Delete contact</h2>
              <p>
                Remove{' '}
                {contactPendingDelete
                  ? `${contactPendingDelete.first_name} ${contactPendingDelete.last_name}`
                  : 'this contact'}{' '}
                from the list? This cannot be undone.
              </p>
              {deleteError ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not delete</AlertTitle>
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              ) : null}
              <section className="grid gap-2 [grid-template-columns:1fr_1fr]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    onDeleteDialogClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeletePending}
                  onClick={() => {
                    if (!confirmDeleteId) return;
                    void onDelete(confirmDeleteId).then(
                      () => {
                        setConfirmDeleteId(null);
                        onDeleteDialogClose();
                      },
                      () => {
                        // Rejection is surfaced via `deleteError` from the mutation (see parent).
                      }
                    );
                  }}
                >
                  Delete contact
                </Button>
              </section>
            </DialogBody>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
