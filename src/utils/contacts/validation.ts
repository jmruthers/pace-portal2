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

type DuplicateContactInput = {
  contacts: ReadonlyArray<GroupedAdditionalContact>;
  candidatePersonId?: string | null;
  candidateEmail?: string | null;
  editingContactId?: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Prevents linking the same person/contact twice in the active contact set.
 */
export function findDuplicateContact(input: DuplicateContactInput): DuplicateContactMatch {
  const personId = (input.candidatePersonId ?? '').trim();
  const email = normalizeEmail(input.candidateEmail);
  const editingId = (input.editingContactId ?? '').trim();

  const existing = input.contacts.find((contact) => {
    if (editingId !== '' && contact.contact_id === editingId) {
      return false;
    }
    if (personId !== '' && contact.contact_person_id === personId) {
      return true;
    }
    if (personId === '' && email !== '' && normalizeEmail(contact.email) === email) {
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
