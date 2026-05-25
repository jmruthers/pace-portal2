import { z } from '@solvera/pace-core/utils';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

export const contactEmailLookupSchema = z
  .object({
    email: z.string().trim().optional().default(''),
    no_email: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.no_email) {
      return;
    }
    if (value.email.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email is required unless you continue without email.',
        path: ['email'],
      });
      return;
    }
    const parsed = z.string().email().safeParse(value.email);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid email address.',
        path: ['email'],
      });
    }
  });

export const contactRelationshipSchema = z.object({
  contact_type_id: z.string().trim().min(1, 'Relationship type is required.'),
  permission_type: z.string().trim().min(1, 'Permission type is required.'),
});

export const contactFullFormSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required.'),
    last_name: z.string().trim().min(1, 'Last name is required.'),
    preferred_name: z.string().trim().optional().default(''),
    email: z.string().trim().optional().default(''),
    phone_number: z.string().trim().optional().default(''),
    phone_type_id: z.number().int().positive().nullable().optional().default(null),
    contact_type_id: z.string().trim().min(1, 'Relationship type is required.'),
    permission_type: z.string().trim().min(1, 'Permission type is required.'),
  })
  .superRefine((value, ctx) => {
    if (value.email.trim() === '') {
      return;
    }
    const parsed = z.string().email().safeParse(value.email);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid email address.',
        path: ['email'],
      });
    }
  });

export type ContactEmailLookupValues = z.infer<typeof contactEmailLookupSchema>;
export type ContactRelationshipValues = z.infer<typeof contactRelationshipSchema>;
export type ContactFullFormValues = z.infer<typeof contactFullFormSchema>;

export type DuplicateContactMatch = {
  isDuplicate: boolean;
  existingContact: GroupedAdditionalContact | null;
  message: string | null;
};

export type DuplicateContactCandidate = {
  candidatePersonId?: string | null;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
  candidateFirstName?: string | null;
  candidateLastName?: string | null;
  candidateContactTypeId?: string | null;
};

type DuplicateContactInput = DuplicateContactCandidate & {
  contacts: ReadonlyArray<GroupedAdditionalContact>;
  editingContactId?: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/** Digits-only comparison so formatting differences still match. */
export function normalizeContactPhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

function normalizeContactName(first: string, last: string): string {
  return `${first.trim().toLowerCase()} ${last.trim().toLowerCase()}`.trim();
}

function isSkippedForEdit(contact: GroupedAdditionalContact, editingId: string): boolean {
  return editingId !== '' && contact.contact_id === editingId;
}

function contactMatchesPhone(contact: GroupedAdditionalContact, phoneDigits: string): boolean {
  if (phoneDigits === '') {
    return false;
  }
  return contact.phones.some((phone) => normalizeContactPhone(phone.phone_number) === phoneDigits);
}

/**
 * Prevents linking the same person/contact twice in the active contact set.
 * Matches by person id, email, shared phone number, or same name + relationship type (manual/no-email path).
 */
export function findDuplicateContact(input: DuplicateContactInput): DuplicateContactMatch {
  const personId = (input.candidatePersonId ?? '').trim();
  const email = normalizeEmail(input.candidateEmail);
  const phoneDigits = normalizeContactPhone(input.candidatePhone);
  const candidateName = normalizeContactName(
    input.candidateFirstName ?? '',
    input.candidateLastName ?? ''
  );
  const contactTypeId = (input.candidateContactTypeId ?? '').trim();
  const editingId = (input.editingContactId ?? '').trim();

  const existing = input.contacts.find((contact) => {
    if (isSkippedForEdit(contact, editingId)) {
      return false;
    }
    if (personId !== '' && contact.contact_person_id === personId) {
      return true;
    }
    if (email !== '' && normalizeEmail(contact.email) === email) {
      return true;
    }
    if (contactMatchesPhone(contact, phoneDigits)) {
      return true;
    }
    if (
      candidateName !== '' &&
      contactTypeId !== '' &&
      normalizeContactName(contact.first_name, contact.last_name) === candidateName &&
      String(contact.contact_type_id) === contactTypeId
    ) {
      return true;
    }
    return false;
  });

  if (!existing) {
    return { isDuplicate: false, existingContact: null, message: null };
  }

  return {
    isDuplicate: true,
    existingContact: existing,
    message: `This person is already linked as ${existing.first_name} ${existing.last_name}. Edit the existing contact from the list instead.`,
  };
}
