import { describe, expect, it } from 'vitest';
import {
  contactEmailLookupSchema,
  contactFullFormSchema,
  findDuplicateContact,
} from '@/utils/contacts/validation';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

const contacts: GroupedAdditionalContact[] = [
  {
    contact_id: 'c1',
    contact_person_id: 'p1',
    contact_type_id: 'ct-1',
    contact_type_name: 'Emergency',
    email: 'sam@example.com',
    first_name: 'Sam',
    last_name: 'Lee',
    member_id: 'm1',
    organisation_id: 'org-1',
    permission_type: 'view',
    phones: [{ phone_number: '0400', phone_type: 'Mobile' }],
  },
];

describe('contactEmailLookupSchema', () => {
  it('requires email unless no-email branch is selected', () => {
    const invalid = contactEmailLookupSchema.safeParse({
      email: '',
      no_email: false,
    });
    expect(invalid.success).toBe(false);

    const valid = contactEmailLookupSchema.safeParse({
      email: '',
      no_email: true,
    });
    expect(valid.success).toBe(true);
  });
});

describe('contactFullFormSchema', () => {
  it('validates required fields and email format when provided', () => {
    const invalid = contactFullFormSchema.safeParse({
      first_name: '',
      last_name: '',
      preferred_name: '',
      email: 'bad',
      phone_number: '',
      phone_type_id: null,
      contact_type_id: '',
      permission_type: '',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('findDuplicateContact', () => {
  it('blocks duplicate by matched person id', () => {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: 'p1',
      candidateEmail: 'new@example.com',
    });
    expect(duplicate.isDuplicate).toBe(true);
    expect(duplicate.existingContact?.contact_id).toBe('c1');
  });

  it('blocks duplicate by email for manual match path', () => {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: null,
      candidateEmail: 'SAM@example.com',
    });
    expect(duplicate.isDuplicate).toBe(true);
  });

  it('does not block when editing the same contact', () => {
    const duplicate = findDuplicateContact({
      contacts,
      candidatePersonId: 'p1',
      candidateEmail: 'sam@example.com',
      editingContactId: 'c1',
    });
    expect(duplicate.isDuplicate).toBe(false);
  });
});
