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
  type DuplicateContactCandidate,
} from '@/utils/contacts/validation';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';
import { buildContactPermissionOptions } from '@/utils/contacts/permissionTypes';
import { resolvePhoneTypeIdFromLabel } from '@/utils/contacts/phoneTypeResolution';
import {
  mapContactSaveError,
  normalizeContactSaveValues,
  saveContactCreate,
  saveContactEdit,
} from '@/utils/contacts/contactSaveHelpers';
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
    () => buildContactPermissionOptions(contacts, formState.draft.permission_type),
    [contacts, formState.draft.permission_type]
  );

  const referenceData = references.data;

  const fullFormDefaultValues = useMemo((): ContactFullFormValues => {
    const editPhoneTypeId =
      mode === 'edit' && initialContact
        ? resolvePhoneTypeIdFromLabel(
            initialContact.phones[0]?.phone_type,
            referenceData?.phoneTypes ?? []
          )
        : null;

    return {
      first_name: formState.draft.first_name,
      last_name: formState.draft.last_name,
      preferred_name: formState.draft.preferred_name,
      email: formState.draft.email,
      phone_number: formState.draft.phone_number,
      phone_type_id: formState.draft.phone_type_id ?? editPhoneTypeId,
      contact_type_id: formState.draft.contact_type_id,
      permission_type: formState.draft.permission_type,
    };
  }, [formState.draft, initialContact, mode, referenceData?.phoneTypes]);

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

  const setDuplicateBlocked = (candidate: DuplicateContactCandidate) => {
    const duplicate = findDuplicateContact({
      contacts,
      editingContactId,
      ...candidate,
    });
    if (!duplicate.isDuplicate || !duplicate.message || !duplicate.existingContact) {
      return null;
    }
    formState.setBlocked(duplicate.message);
    return duplicate.existingContact;
  };

  const saveContact = async (values: ContactFullFormValues) => {
    const linkExisting = Boolean(formState.draft.link_existing_person && formState.matchedPerson);
    const normalizedValues = normalizeContactSaveValues(values, formState);

    formState.applyFullValues(normalizedValues);
    const duplicateContact = setDuplicateBlocked({
      candidatePersonId: formState.draft.match_person_id,
      candidateEmail: normalizedValues.email,
      candidatePhone: normalizedValues.phone_number,
      candidateFirstName: normalizedValues.first_name,
      candidateLastName: normalizedValues.last_name,
      candidateContactTypeId: normalizedValues.contact_type_id,
    });
    if (duplicateContact) {
      return;
    }

    if (mode === 'edit' && !initialContact) {
      formState.setBlocked('Could not resolve the selected contact for editing. Return to contacts and try again.');
      return;
    }

    try {
      if (mode === 'edit' && initialContact) {
        await saveContactEdit({
          normalizedValues,
          initialContact,
          phoneTypes: referenceData.phoneTypes,
          updateContact,
          onSaved,
        });
        return;
      }

      await saveContactCreate({
        normalizedValues,
        formState,
        linkExisting,
        findByEmail,
        setDuplicateBlocked,
        resolveCreateMemberId,
        createContact,
        onSaved,
      });
    } catch (error) {
      formState.setBlocked(mapContactSaveError(error));
    }
  };

  if (formState.step === 'blocked') {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: formState.draft.match_person_id,
      candidateEmail: formState.draft.email,
      candidatePhone: formState.draft.phone_number,
      candidateFirstName: formState.draft.first_name,
      candidateLastName: formState.draft.last_name,
      candidateContactTypeId: formState.draft.contact_type_id,
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
            const duplicateContact = setDuplicateBlocked({
              candidatePersonId: match.person_id,
              candidateEmail: email,
            });
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
        contactTypes={referenceData.contactTypes.map((row) => ({
          id: String(row.id),
          name: row.name,
        }))}
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
      contactTypes={referenceData.contactTypes.map((row) => ({
        id: String(row.id),
        name: row.name,
      }))}
      phoneTypes={referenceData.phoneTypes.map((row) => ({ id: row.id, name: row.name }))}
      permissionOptions={permissionOptions}
      defaultValues={fullFormDefaultValues}
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
