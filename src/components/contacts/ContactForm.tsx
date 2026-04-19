import { useMemo, useState } from 'react';
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
import { isOk } from '@solvera/pace-core/types';
import { EmailFormStep } from '@/components/contacts/ContactForm/EmailFormStep';
import { FullFormStep } from '@/components/contacts/ContactForm/FullFormStep';
import { MatchConfirmationStep } from '@/components/contacts/ContactForm/MatchConfirmationStep';
import { RelationshipFormStep } from '@/components/contacts/ContactForm/RelationshipFormStep';
import {
  useContactFormState,
  type ContactFormMode,
} from '@/hooks/contacts/useContactFormState';
import {
  findDuplicateContact,
  type ContactEmailLookupValues,
  type ContactFullFormValues,
} from '@/utils/contacts/validation';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';
import { useContactOperations } from '@/hooks/contacts/useContactOperations';
import {
  useContactFormReferenceData,
  useContactPersonLookup,
} from '@/hooks/contacts/useContactFormData';

type ContactFormProps = {
  mode: ContactFormMode;
  contacts: ReadonlyArray<GroupedAdditionalContact>;
  initialContact: GroupedAdditionalContact | null;
  targetMemberId: string | null;
  onCancel: () => void;
  onSaved: () => void;
  onEditExistingContact: (contact: GroupedAdditionalContact) => void;
};

const DEFAULT_PERMISSION_OPTIONS = ['view', 'edit'] as const;

function buildPermissionOptions(
  contacts: ReadonlyArray<GroupedAdditionalContact>,
  initialPermission: string
): ReadonlyArray<string> {
  const values = new Set<string>(DEFAULT_PERMISSION_OPTIONS);
  if (initialPermission.trim() !== '') {
    values.add(initialPermission);
  }
  for (const item of contacts) {
    if (item.permission_type.trim() !== '') {
      values.add(item.permission_type);
    }
  }
  return [...values];
}

export function ContactForm({
  mode,
  contacts,
  initialContact,
  targetMemberId,
  onCancel,
  onSaved,
  onEditExistingContact,
}: ContactFormProps) {
  const formState = useContactFormState({
    mode,
    initialContact,
  });
  const { createContact, updateContact } = useContactOperations();
  const references = useContactFormReferenceData();
  const { findByEmail } = useContactPersonLookup();
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);

  const permissionOptions = useMemo(
    () => buildPermissionOptions(contacts, formState.draft.permission_type),
    [contacts, formState.draft.permission_type]
  );

  if (references.isLoading || references.isFetching) {
    return (
      <section className="grid min-h-[30vh] place-items-center" aria-busy="true" aria-label="Contact form loading">
        <LoadingSpinner label="Loading contact form..." />
      </section>
    );
  }

  if (references.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load contact form</AlertTitle>
        <AlertDescription>
          {references.error instanceof Error ? references.error.message : 'Something went wrong.'}
        </AlertDescription>
      </Alert>
    );
  }

  const referenceData = references.data;
  if (!referenceData) {
    return null;
  }

  const editingContactId = mode === 'edit' ? initialContact?.contact_id ?? null : null;

  const setDuplicateBlocked = (candidatePersonId: string | null, candidateEmail: string) => {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId,
      candidateEmail,
      editingContactId,
    });
    if (!duplicate.isDuplicate || !duplicate.message || !duplicate.existingContact) {
      return null;
    }
    formState.setBlocked(duplicate.message);
    return duplicate.existingContact;
  };

  const saveContact = async (values: ContactFullFormValues) => {
    formState.applyFullValues(values);
    const duplicateContact = setDuplicateBlocked(formState.draft.match_person_id, values.email);
    if (duplicateContact) {
      return;
    }

    if (mode === 'edit' && initialContact) {
      await updateContact.mutateAsync({
        contactId: initialContact.contact_id,
        firstName: values.first_name,
        lastName: values.last_name,
        preferredName: values.preferred_name,
        email: values.email,
        contactTypeId: values.contact_type_id,
        permissionType: values.permission_type,
        phoneNumber: values.phone_number,
        phoneTypeId: values.phone_type_id,
      });
      onSaved();
      return;
    }

    await createContact.mutateAsync({
      memberId: targetMemberId,
      firstName: values.first_name,
      lastName: values.last_name,
      preferredName: values.preferred_name,
      email: values.email,
      contactTypeId: values.contact_type_id,
      permissionType: values.permission_type,
      phoneNumber: values.phone_number,
      phoneTypeId: values.phone_type_id,
    });
    onSaved();
  };

  if (formState.step === 'blocked') {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: formState.draft.match_person_id,
      candidateEmail: formState.draft.email,
      editingContactId,
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact already linked</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Duplicate contact blocked</AlertTitle>
            <AlertDescription>{formState.blockedMessage ?? 'Edit the existing contact instead.'}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="grid gap-2 md:grid-cols-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back to contacts
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!duplicate.existingContact}
            onClick={() => {
              if (!duplicate.existingContact) return;
              onEditExistingContact(duplicate.existingContact);
            }}
          >
            Edit existing contact
          </Button>
          <Button type="button" variant="ghost" onClick={formState.clearBlocked}>
            Try again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (formState.step === 'email') {
    return (
      <EmailFormStep
        defaultEmail={formState.draft.email}
        isCheckingMatch={isCheckingMatch}
        onCancel={onCancel}
        onSubmit={async (values: ContactEmailLookupValues) => {
          if (values.no_email) {
            formState.setCreatePathNoEmail();
            return;
          }
          const email = values.email.trim().toLowerCase();
          formState.setCreatePathHasEmail(email);
          setIsCheckingMatch(true);
          try {
            const result = await findByEmail(email);
            if (!isOk(result)) {
              formState.setBlocked(result.error.message);
              return;
            }
            const match = result.data;
            formState.setMatchedPerson(match);
            if (!match) {
              formState.toRelationshipStep();
              return;
            }
            const duplicateContact = setDuplicateBlocked(match.person_id, email);
            if (duplicateContact) {
              return;
            }
            formState.toMatchStep();
          } finally {
            setIsCheckingMatch(false);
          }
        }}
      />
    );
  }

  if (formState.matchedPerson && formState.step === 'match') {
    return (
      <MatchConfirmationStep
        match={formState.matchedPerson}
        onBack={formState.toEmailStep}
        onCancel={onCancel}
        onLinkExisting={() => {
          formState.chooseLinkExistingPerson();
        }}
        onCreateNew={() => {
          formState.chooseCreateNewFromMatch();
        }}
      />
    );
  }

  if (formState.step === 'relationship') {
    return (
      <RelationshipFormStep
        contactTypes={referenceData.contactTypes.map((row) => ({ id: row.id, name: row.name }))}
        permissionOptions={permissionOptions}
        defaultValues={{
          contact_type_id: formState.draft.contact_type_id,
          permission_type: formState.draft.permission_type,
        }}
        onBack={mode === 'edit' ? onCancel : formState.toEmailStep}
        onCancel={onCancel}
        onSubmit={(values) => {
          formState.applyRelationship(values);
        }}
      />
    );
  }

  return (
    <FullFormStep
      mode={mode}
      contactTypes={referenceData.contactTypes.map((row) => ({ id: row.id, name: row.name }))}
      phoneTypes={referenceData.phoneTypes.map((row) => ({ id: row.id, name: row.name }))}
      permissionOptions={permissionOptions}
      defaultValues={{
        first_name: formState.draft.first_name,
        last_name: formState.draft.last_name,
        preferred_name: formState.draft.preferred_name,
        email: formState.draft.email,
        phone_number: formState.draft.phone_number,
        phone_type_id: formState.draft.phone_type_id,
        contact_type_id: formState.draft.contact_type_id,
        permission_type: formState.draft.permission_type,
      }}
      canBack={mode === 'create'}
      isSaving={createContact.isPending || updateContact.isPending}
      onBack={() => {
        if (mode === 'edit') {
          onCancel();
          return;
        }
        formState.toRelationshipStep();
      }}
      onCancel={onCancel}
      onSubmit={saveContact}
    />
  );
}
