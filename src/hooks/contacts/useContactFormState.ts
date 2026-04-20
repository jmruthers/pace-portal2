import { useMemo, useState } from 'react';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';
import type { ContactFullFormValues, ContactRelationshipValues } from '@/utils/contacts/validation';

export type ContactFormMode = 'create' | 'edit';
export type ContactFormStep = 'email' | 'match' | 'relationship' | 'full' | 'blocked';

export type EmailPersonMatch = {
  person_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone_number: string | null;
  phone_type_id: number | null;
};

export type ContactDraft = ContactFullFormValues & {
  match_person_id: string | null;
  link_existing_person: boolean;
};

export type UseContactFormStateInput = {
  mode: ContactFormMode;
  initialContact: GroupedAdditionalContact | null;
};

export type UseContactFormStateResult = {
  step: ContactFormStep;
  draft: ContactDraft;
  matchedPerson: EmailPersonMatch | null;
  blockedMessage: string | null;
  setBlocked: (message: string) => void;
  clearBlocked: () => void;
  setMatchedPerson: (match: EmailPersonMatch | null) => void;
  chooseLinkExistingPerson: () => void;
  chooseCreateNewFromMatch: () => void;
  applyRelationship: (values: ContactRelationshipValues) => void;
  applyFullValues: (values: ContactFullFormValues) => void;
  setCreatePathNoEmail: () => void;
  setCreatePathHasEmail: (email: string) => void;
  toEmailStep: () => void;
  toMatchStep: () => void;
  toRelationshipStep: () => void;
  toFullStep: () => void;
};

function createDraftFromContact(contact: GroupedAdditionalContact | null): ContactDraft {
  const firstPhone = contact?.phones[0] ?? null;
  return {
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    preferred_name: '',
    email: contact?.email ?? '',
    phone_number: firstPhone?.phone_number ?? '',
    phone_type_id: null,
    contact_type_id: contact?.contact_type_id != null ? String(contact.contact_type_id) : '',
    permission_type: contact?.permission_type ?? '',
    match_person_id: contact?.contact_person_id ?? null,
    link_existing_person: false,
  };
}

export function useContactFormState(input: UseContactFormStateInput): UseContactFormStateResult {
  const initialDraft = useMemo(() => createDraftFromContact(input.initialContact), [input.initialContact]);
  const [draft, setDraft] = useState<ContactDraft>(initialDraft);
  const [step, setStep] = useState<ContactFormStep>(input.mode === 'edit' ? 'full' : 'email');
  const [matchedPerson, setMatchedPerson] = useState<EmailPersonMatch | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  return {
    step,
    draft,
    matchedPerson,
    blockedMessage,
    setBlocked: (message: string) => {
      setBlockedMessage(message);
      setStep('blocked');
    },
    clearBlocked: () => {
      setBlockedMessage(null);
      setStep('email');
    },
    setMatchedPerson: (match: EmailPersonMatch | null) => {
      setMatchedPerson(match);
    },
    chooseLinkExistingPerson: () => {
      setDraft((prev) => ({
        ...prev,
        first_name: matchedPerson?.first_name ?? prev.first_name,
        last_name: matchedPerson?.last_name ?? prev.last_name,
        preferred_name: matchedPerson?.preferred_name ?? prev.preferred_name,
        email: matchedPerson?.email ?? prev.email,
        phone_number: matchedPerson?.phone_number ?? prev.phone_number,
        phone_type_id: matchedPerson?.phone_type_id ?? prev.phone_type_id,
        match_person_id: matchedPerson?.person_id ?? prev.match_person_id,
        link_existing_person: true,
      }));
      setStep('relationship');
    },
    chooseCreateNewFromMatch: () => {
      setDraft((prev) => ({
        ...prev,
        match_person_id: null,
        link_existing_person: false,
      }));
      setStep('relationship');
    },
    applyRelationship: (values: ContactRelationshipValues) => {
      setDraft((prev) => ({
        ...prev,
        contact_type_id: values.contact_type_id,
        permission_type: values.permission_type,
      }));
      setStep('full');
    },
    applyFullValues: (values: ContactFullFormValues) => {
      setDraft((prev) => ({
        ...prev,
        ...values,
      }));
    },
    setCreatePathNoEmail: () => {
      setDraft((prev) => ({
        ...prev,
        email: '',
      }));
      setStep('relationship');
    },
    setCreatePathHasEmail: (email: string) => {
      setDraft((prev) => ({
        ...prev,
        email,
      }));
    },
    toEmailStep: () => {
      setStep('email');
    },
    toMatchStep: () => {
      setStep('match');
    },
    toRelationshipStep: () => {
      setStep('relationship');
    },
    toFullStep: () => {
      setStep('full');
    },
  };
}
