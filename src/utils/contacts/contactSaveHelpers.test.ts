import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@solvera/pace-core/types';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';
import type { ContactFullFormValues } from '@/utils/contacts/validation';
import {
  buildEditPhoneMutationPayload,
  mapContactSaveError,
  normalizeContactSaveValues,
  saveContactCreate,
  saveContactEdit,
} from '@/utils/contacts/contactSaveHelpers';
import type { Database } from '@/types/pace-database';

type PhoneTypeRow = Database['public']['Tables']['core_phone_type']['Row'];

const baseValues: ContactFullFormValues = {
  first_name: 'Alex',
  last_name: 'Taylor',
  preferred_name: '',
  email: 'alex@example.com',
  phone_number: '0400111222',
  phone_type_id: 1,
  contact_type_id: 'ct-1',
  permission_type: 'view',
};

const initialContact: GroupedAdditionalContact = {
  contact_id: 'c1',
  contact_person_id: 'p1',
  contact_type_id: 'ct-1',
  contact_type_name: 'Emergency',
  email: 'alex@example.com',
  first_name: 'Alex',
  last_name: 'Taylor',
  member_id: 'm1',
  organisation_id: 'org-1',
  permission_type: 'view',
  phones: [{ phone_number: '0400111222', phone_type: 'Mobile' }],
};

const phoneTypes = [{ id: 1, name: 'Mobile' }] as PhoneTypeRow[];

function formStateStub(overrides: Record<string, unknown> = {}) {
  return {
    draft: {
      link_existing_person: false,
      create_new_from_match: false,
      ...((overrides.draft as object) ?? {}),
    },
    matchedPerson: null as {
      person_id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      email: string | null;
    } | null,
    setBlocked: vi.fn(),
    setMatchedPerson: vi.fn(),
    toMatchStep: vi.fn(),
    ...(overrides as object),
  };
}

describe('contactSaveHelpers', () => {
  it('normalizeContactSaveValues returns values unchanged when not linking existing person', () => {
    const formState = formStateStub();
    expect(normalizeContactSaveValues(baseValues, formState as never)).toEqual(baseValues);
  });

  it('normalizeContactSaveValues merges matched person fields when linking existing person', () => {
    const formState = formStateStub({
      draft: { link_existing_person: true },
      matchedPerson: {
        person_id: 'p-match',
        first_name: 'Matched',
        last_name: 'Person',
        preferred_name: 'MP',
        email: 'matched@example.com',
      },
    });
    const merged = normalizeContactSaveValues(baseValues, formState as never);
    expect(merged.first_name).toBe('Matched');
    expect(merged.email).toBe('matched@example.com');
  });

  it('buildEditPhoneMutationPayload detects primary phone update', () => {
    const payload = buildEditPhoneMutationPayload(
      { ...baseValues, phone_number: '0400999888', phone_type_id: 2 },
      initialContact,
      [{ id: 1, name: 'Mobile' }, { id: 2, name: 'Home' }] as PhoneTypeRow[]
    );
    expect(payload.primaryPhoneUpdate).toEqual({
      previousPhoneNumber: '0400111222',
      nextPhoneNumber: '0400999888',
      phoneTypeId: 2,
    });
    expect(payload.shouldInsertPhone).toBe(false);
  });

  it('buildEditPhoneMutationPayload detects insert when contact had no phone', () => {
    const payload = buildEditPhoneMutationPayload(
      baseValues,
      { ...initialContact, phones: [] },
      phoneTypes
    );
    expect(payload.primaryPhoneUpdate).toBeUndefined();
    expect(payload.shouldInsertPhone).toBe(true);
  });

  it('buildEditPhoneMutationPayload is unchanged when phone matches', () => {
    const payload = buildEditPhoneMutationPayload(baseValues, initialContact, phoneTypes);
    expect(payload.primaryPhoneUpdate).toBeUndefined();
    expect(payload.shouldInsertPhone).toBe(false);
  });

  it('mapContactSaveError maps unique_email to participant-safe message', () => {
    expect(mapContactSaveError(new Error('unique_email violation'))).toContain('already used');
    expect(mapContactSaveError('plain failure')).toBe('Could not save contact.');
    expect(mapContactSaveError(new Error('network'))).toBe('network');
  });

  it('saveContactEdit calls update mutation and onSaved', async () => {
    const updateContact = { mutateAsync: vi.fn().mockResolvedValue(undefined) };
    const onSaved = vi.fn();
    await saveContactEdit({
      normalizedValues: baseValues,
      initialContact,
      phoneTypes,
      updateContact,
      onSaved,
    });
    expect(updateContact.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'c1',
        firstName: 'Alex',
      })
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('saveContactCreate blocks when email lookup fails', async () => {
    const formState = formStateStub();
    const findByEmail = vi.fn().mockResolvedValue(err({ code: 'X', message: 'Lookup failed' }));
    await saveContactCreate({
      normalizedValues: baseValues,
      formState: formState as never,
      linkExisting: false,
      findByEmail,
      setDuplicateBlocked: vi.fn(),
      resolveCreateMemberId: vi.fn(),
      createContact: { mutateAsync: vi.fn() },
      onSaved: vi.fn(),
    });
    expect(formState.setBlocked).toHaveBeenCalledWith('Lookup failed');
  });

  it('saveContactCreate routes to match step when email lookup finds a person', async () => {
    const formState = formStateStub();
    const findByEmail = vi.fn().mockResolvedValue(
      ok({
        person_id: 'p2',
        first_name: 'Sam',
        last_name: 'Lee',
        preferred_name: null,
        email: 'alex@example.com',
        phone_number: null,
        phone_type_id: null,
      })
    );
    await saveContactCreate({
      normalizedValues: baseValues,
      formState: formState as never,
      linkExisting: false,
      findByEmail,
      setDuplicateBlocked: vi.fn().mockReturnValue(null),
      resolveCreateMemberId: vi.fn(),
      createContact: { mutateAsync: vi.fn() },
      onSaved: vi.fn(),
    });
    expect(formState.setMatchedPerson).toHaveBeenCalled();
    expect(formState.toMatchStep).toHaveBeenCalled();
  });

  it('saveContactCreate blocks when member context cannot be resolved', async () => {
    const formState = formStateStub({ draft: { create_new_from_match: true } });
    await saveContactCreate({
      normalizedValues: { ...baseValues, email: '' },
      formState: formState as never,
      linkExisting: false,
      findByEmail: vi.fn(),
      setDuplicateBlocked: vi.fn(),
      resolveCreateMemberId: vi.fn().mockResolvedValue(null),
      createContact: { mutateAsync: vi.fn() },
      onSaved: vi.fn(),
    });
    expect(formState.setBlocked).toHaveBeenCalledWith(
      'Could not resolve member context for this contact. Please refresh and try again.'
    );
  });

  it('saveContactCreate creates contact and calls onSaved', async () => {
    const formState = formStateStub({ draft: { create_new_from_match: true } });
    const createContact = { mutateAsync: vi.fn().mockResolvedValue(undefined) };
    const onSaved = vi.fn();
    await saveContactCreate({
      normalizedValues: { ...baseValues, email: '' },
      formState: formState as never,
      linkExisting: true,
      findByEmail: vi.fn(),
      setDuplicateBlocked: vi.fn(),
      resolveCreateMemberId: vi.fn().mockResolvedValue('m1'),
      createContact,
      onSaved,
    });
    expect(createContact.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        email: '',
      })
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
