import { isOk, type ApiResult } from '@solvera/pace-core/types';
import type { ContactFullFormValues, DuplicateContactCandidate } from '@/utils/contacts/validation';
import { normalizeContactPhone } from '@/utils/contacts/validation';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';
import { resolvePhoneTypeIdFromLabel } from '@/utils/contacts/phoneTypeResolution';
import type { useContactFormState, EmailPersonMatch } from '@/hooks/contacts/useContactFormState';
import type {
  CreateContactInput,
  UpdateContactInput,
} from '@/hooks/contacts/useContactOperations';
import type { Database } from '@/types/pace-database';

type ContactFormState = ReturnType<typeof useContactFormState>;
type PhoneTypeRow = Database['public']['Tables']['core_phone_type']['Row'];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function normalizeContactSaveValues(
  values: ContactFullFormValues,
  formState: ContactFormState
): ContactFullFormValues {
  const linkExisting = formState.draft.link_existing_person && formState.matchedPerson;
  if (!linkExisting) {
    return values;
  }
  return {
    ...values,
    first_name: formState.matchedPerson?.first_name ?? values.first_name,
    last_name: formState.matchedPerson?.last_name ?? values.last_name,
    preferred_name: formState.matchedPerson?.preferred_name ?? values.preferred_name,
    email: formState.matchedPerson?.email ?? values.email,
  };
}

export function buildEditPhoneMutationPayload(
  normalizedValues: ContactFullFormValues,
  initialContact: GroupedAdditionalContact,
  phoneTypes: PhoneTypeRow[]
) {
  const submittedPhone = normalizeText(normalizedValues.phone_number);
  const primaryInitial = initialContact.phones[0] ?? null;
  const initialPhoneText = normalizeText(primaryInitial?.phone_number ?? '');
  const initialDigits = normalizeContactPhone(initialPhoneText);
  const submittedDigits = normalizeContactPhone(submittedPhone);
  const initialTypeId = resolvePhoneTypeIdFromLabel(primaryInitial?.phone_type, phoneTypes);
  const submittedTypeId = normalizedValues.phone_type_id ?? null;
  const phoneFieldChanged = submittedDigits !== initialDigits || submittedTypeId !== initialTypeId;

  const primaryPhoneUpdate =
    submittedPhone !== '' && initialDigits !== '' && phoneFieldChanged
      ? {
          previousPhoneNumber: initialPhoneText,
          nextPhoneNumber: submittedPhone,
          phoneTypeId: submittedTypeId,
        }
      : undefined;

  const shouldInsertPhone = submittedPhone !== '' && initialDigits === '' && primaryPhoneUpdate == null;

  return { primaryPhoneUpdate, shouldInsertPhone };
}

export function mapContactSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Could not save contact.';
  if (message.toLowerCase().includes('unique_email')) {
    return 'This email is already used by an existing person. Link the existing person instead of creating a new email record.';
  }
  return message;
}

export async function saveContactEdit(args: {
  normalizedValues: ContactFullFormValues;
  initialContact: GroupedAdditionalContact;
  phoneTypes: PhoneTypeRow[];
  updateContact: { mutateAsync: (input: UpdateContactInput) => Promise<void> };
  onSaved: () => void;
}): Promise<void> {
  const { normalizedValues, initialContact, phoneTypes, updateContact, onSaved } = args;
  const { primaryPhoneUpdate, shouldInsertPhone } = buildEditPhoneMutationPayload(
    normalizedValues,
    initialContact,
    phoneTypes
  );

  await updateContact.mutateAsync({
    contactId: initialContact.contact_id,
    firstName: normalizedValues.first_name,
    lastName: normalizedValues.last_name,
    preferredName: normalizedValues.preferred_name,
    email: normalizedValues.email,
    contactTypeId: normalizedValues.contact_type_id,
    permissionType: normalizedValues.permission_type,
    phoneNumber: shouldInsertPhone ? normalizedValues.phone_number : undefined,
    phoneTypeId: shouldInsertPhone ? normalizedValues.phone_type_id ?? undefined : undefined,
    primaryPhoneUpdate,
  });
  onSaved();
}

export async function saveContactCreate(args: {
  normalizedValues: ContactFullFormValues;
  formState: ContactFormState;
  linkExisting: boolean;
  findByEmail: (email: string) => Promise<ApiResult<EmailPersonMatch | null>>;
  setDuplicateBlocked: (candidate: DuplicateContactCandidate) => GroupedAdditionalContact | null;
  resolveCreateMemberId: () => Promise<string | null>;
  createContact: { mutateAsync: (input: CreateContactInput) => Promise<void> };
  onSaved: () => void;
}): Promise<void> {
  const {
    normalizedValues,
    formState,
    linkExisting,
    findByEmail,
    setDuplicateBlocked,
    resolveCreateMemberId,
    createContact,
    onSaved,
  } = args;

  const trimmedEmail = normalizedValues.email.trim().toLowerCase();
  if (!linkExisting && !formState.draft.create_new_from_match && trimmedEmail !== '') {
    const lookup = await findByEmail(trimmedEmail);
    if (!isOk(lookup)) {
      formState.setBlocked(lookup.error.message);
      return;
    }
    if (lookup.data) {
      formState.setMatchedPerson(lookup.data);
      const duplicateFromLookup = setDuplicateBlocked({
        candidatePersonId: lookup.data.person_id,
        candidateEmail: trimmedEmail,
      });
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
}
