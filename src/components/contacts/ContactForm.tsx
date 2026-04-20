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
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
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
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';

type ContactFormProps = {
  mode: ContactFormMode;
  contacts: ReadonlyArray<GroupedAdditionalContact>;
  initialContact: GroupedAdditionalContact | null;
  memberId: string | null;
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

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function ContactForm({
  mode,
  contacts,
  initialContact,
  memberId,
  onCancel,
  onSaved,
  onEditExistingContact,
}: ContactFormProps) {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
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
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const actingUserId = user?.id ?? null;

  const resolveCreateMemberId = async (): Promise<string | null> => {
    if (memberId) {
      return memberId;
    }
    if (!secure || !actingUserId || !organisationId) {
      return null;
    }
    const pm = await fetchCurrentPersonMember(secure, actingUserId, organisationId);
    if (!isOk(pm)) {
      return null;
    }
    return pm.data.member?.id ?? null;
  };

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
    const linkExisting = formState.draft.link_existing_person && formState.matchedPerson;
    const normalizedValues = linkExisting
      ? {
          ...values,
          first_name: formState.matchedPerson?.first_name ?? values.first_name,
          last_name: formState.matchedPerson?.last_name ?? values.last_name,
          preferred_name: formState.matchedPerson?.preferred_name ?? values.preferred_name,
          email: formState.matchedPerson?.email ?? values.email,
        }
      : values;

    formState.applyFullValues(normalizedValues);
    const duplicateContact = setDuplicateBlocked(formState.draft.match_person_id, normalizedValues.email);
    if (duplicateContact) {
      return;
    }

    if (mode === 'edit' && !initialContact) {
      formState.setBlocked('Could not resolve the selected contact for editing. Return to contacts and try again.');
      return;
    }

    try {
      if (mode === 'edit' && initialContact) {
        const submittedPhone = normalizeText(normalizedValues.phone_number);
        const existingPhones = new Set(
          initialContact.phones
            .map((phone) => normalizeText(phone.phone_number))
            .filter((phone) => phone !== '')
        );
        const shouldInsertPhone = submittedPhone !== '' && !existingPhones.has(submittedPhone);

        await updateContact.mutateAsync({
          contactId: initialContact.contact_id,
          firstName: normalizedValues.first_name,
          lastName: normalizedValues.last_name,
          preferredName: normalizedValues.preferred_name,
          email: normalizedValues.email,
          contactTypeId: normalizedValues.contact_type_id,
          permissionType: normalizedValues.permission_type,
          phoneNumber: shouldInsertPhone ? normalizedValues.phone_number : undefined,
          phoneTypeId: shouldInsertPhone ? normalizedValues.phone_type_id : undefined,
        });
        onSaved();
        return;
      }

      const trimmedEmail = normalizedValues.email.trim().toLowerCase();
      if (!linkExisting && !formState.draft.create_new_from_match && trimmedEmail !== '') {
        const lookup = await findByEmail(trimmedEmail);
        if (!isOk(lookup)) {
          formState.setBlocked(lookup.error.message);
          return;
        }
        if (lookup.data) {
          formState.setMatchedPerson(lookup.data);
          const duplicateFromLookup = setDuplicateBlocked(lookup.data.person_id, trimmedEmail);
          if (!duplicateFromLookup) {
            formState.toMatchStep();
          }
          return;
        }
      }

      const createMemberId = await resolveCreateMemberId();
      if (!createMemberId) {
        formState.setBlocked('Could not resolve member context for this contact. Please refresh and try again.');
        return;
      }

      await createContact.mutateAsync({
        memberId: createMemberId,
        firstName: normalizedValues.first_name,
        lastName: normalizedValues.last_name,
        preferredName: normalizedValues.preferred_name,
        email: linkExisting ? '' : normalizedValues.email,
        contactTypeId: normalizedValues.contact_type_id,
        permissionType: normalizedValues.permission_type,
        phoneNumber: normalizedValues.phone_number,
        phoneTypeId: normalizedValues.phone_type_id,
      });
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save contact.';
      if (message.toLowerCase().includes('unique_email')) {
        formState.setBlocked('This email is already used by an existing person. Link the existing person instead of creating a new email record.');
        return;
      }
      formState.setBlocked(message);
    }
  };

  if (formState.step === 'blocked') {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: formState.draft.match_person_id,
      candidateEmail: formState.draft.email,
      editingContactId,
    });
    const duplicateMode = Boolean(duplicate.existingContact);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{duplicateMode ? 'Contact already linked' : 'Contact not saved'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{duplicateMode ? 'Duplicate contact blocked' : 'Save failed'}</AlertTitle>
            <AlertDescription>{formState.blockedMessage ?? 'Edit the existing contact instead.'}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="grid gap-2 md:grid-cols-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back to contacts
          </Button>
          {duplicateMode ? (
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
          ) : (
            <Button type="button" variant="default" onClick={formState.clearBlocked}>
              Back to form
            </Button>
          )}
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
        email={formState.draft.email}
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
      isLinkExistingPerson={formState.draft.link_existing_person}
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
