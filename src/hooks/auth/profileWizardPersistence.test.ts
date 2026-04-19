import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddressValue } from '@solvera/pace-core/forms';
import {
  normalizeMembershipStatusForSave,
  persistProfileWizardStep0,
  persistProfileWizardStep1,
  persistProfileWizardStep2,
  replacePersonPhones,
  upsertAddressFromValue,
} from '@/hooks/auth/profileWizardPersistence';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';
import type { Database } from '@/types/pace-database';

describe('normalizeMembershipStatusForSave', () => {
  it('defaults to Provisional when absent (aligned with self-service)', () => {
    expect(normalizeMembershipStatusForSave(null)).toBe('Provisional');
    expect(normalizeMembershipStatusForSave(undefined)).toBe('Provisional');
  });

  it('preserves an existing status', () => {
    expect(normalizeMembershipStatusForSave('Suspended')).toBe('Suspended');
  });
});

/** Minimal chain mock for `replacePersonPhones` (select → soft-delete loop → insert loop). */
function createMockDbForPhones(opts: {
  activeRows: { id: string }[];
  readError?: { message: string } | null;
}) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const is = vi.fn(() =>
    Promise.resolve({
      data: opts.readError ? null : opts.activeRows,
      error: opts.readError ?? null,
    })
  );
  const eq = vi.fn(() => ({ is }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn(() => ({ select, update, insert }));

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    updateEq,
    insert,
  };
}

describe('replacePersonPhones', () => {
  it('returns ok when there are no active rows and no phones to insert (empty DB, empty form)', async () => {
    const { client, insert } = createMockDbForPhones({ activeRows: [] });
    const r = await replacePersonPhones(client, 'p1', [], null);
    expect(r.ok).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  it('soft-deletes existing active rows then inserts the new set', async () => {
    const { client, updateEq, insert } = createMockDbForPhones({
      activeRows: [{ id: 'phone-old' }],
    });
    const r = await replacePersonPhones(client, 'p1', [{ phone_number: '0400 111 222', phone_type_id: 1 }], 'u1');
    expect(r.ok).toBe(true);
    expect(updateEq).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('returns error when the initial read fails', async () => {
    const { client } = createMockDbForPhones({
      activeRows: [],
      readError: { message: 'read failed' },
    });
    const r = await replacePersonPhones(client, 'p1', [], null);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('PHONE_READ');
    }
  });
});

const baseStep0Values = {
  first_name: 'A',
  last_name: 'B',
  middle_name: null as string | null,
  preferred_name: null as string | null,
  email: 'a@b.co',
  date_of_birth: '1990-01-01',
  gender_id: 1 as number | null,
  pronoun_id: 2 as number | null,
};

function createMockDbForStep0(opts: {
  existingMember: { id: string; membership_status?: 'Active' | null } | null;
  insertResult: { data: { id: string } | null; error: { message: string } | null };
  recoveredMember: { id: string; membership_status?: 'Active' | null } | null;
}) {
  const personEq = vi.fn().mockResolvedValue({ error: null });
  const memberLookupMaybe = vi.fn().mockResolvedValue({
    data: opts.existingMember,
    error: null,
  });
  const memberRecoverMaybe = vi.fn().mockResolvedValue({
    data: opts.recoveredMember,
    error: null,
  });
  const insertMaybe = vi.fn().mockResolvedValue(opts.insertResult);
  const memberUpdateEq = vi.fn().mockResolvedValue({ error: null });

  let memberSelectCalls = 0;
  const memberSelectChain = () => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: () => {
          memberSelectCalls += 1;
          return memberSelectCalls === 1 ? memberLookupMaybe() : memberRecoverMaybe();
        },
      })),
    })),
  });

  const from = vi.fn((table: string) => {
    if (table === 'core_person') {
      return {
        update: vi.fn(() => ({ eq: personEq })),
      };
    }
    if (table === 'core_member') {
      return {
        select: memberSelectChain,
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ maybeSingle: insertMaybe })),
        })),
        update: vi.fn(() => ({ eq: memberUpdateEq })),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    memberUpdateEq,
    insertMaybe,
  };
}

describe('persistProfileWizardStep0', () => {
  it('returns new member id when insert succeeds', async () => {
    const { client } = createMockDbForStep0({
      existingMember: null,
      insertResult: { data: { id: 'member-new' }, error: null },
      recoveredMember: null,
    });
    const r = await persistProfileWizardStep0({
      db: client,
      organisationId: 'org1',
      userId: 'u1',
      personId: 'p1',
      memberId: null,
      values: baseStep0Values,
      existingMembershipStatus: null,
    });
    expect(r.memberId).toBe('member-new');
  });

  it('updates membership status after recovering member row when insert fails', async () => {
    const { client, memberUpdateEq } = createMockDbForStep0({
      existingMember: null,
      insertResult: { data: null, error: { message: 'duplicate key' } },
      recoveredMember: { id: 'member-existing', membership_status: 'Active' },
    });
    const r = await persistProfileWizardStep0({
      db: client,
      organisationId: 'org1',
      userId: 'u1',
      personId: 'p1',
      memberId: null,
      values: baseStep0Values,
      existingMembershipStatus: null,
    });
    expect(r.memberId).toBe('member-existing');
    expect(memberUpdateEq).toHaveBeenCalled();
  });

  it('throws when insert fails and no member row can be resolved', async () => {
    const { client } = createMockDbForStep0({
      existingMember: null,
      insertResult: { data: null, error: { message: 'policy violation' } },
      recoveredMember: null,
    });
    await expect(
      persistProfileWizardStep0({
        db: client,
        organisationId: 'org1',
        userId: 'u1',
        personId: 'p1',
        memberId: null,
        values: baseStep0Values,
        existingMembershipStatus: null,
      })
    ).rejects.toThrow(/policy violation/);
  });
});

const sampleAddress: AddressValue = {
  line1: '1 Example St',
  locality: 'Sydney',
  countryCode: 'AU',
  formattedAddress: '1 Example St, Sydney',
  placeId: 'place-test',
};

describe('upsertAddressFromValue', () => {
  it('inserts when no existing row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'addr-new' }, error: null });
    const db = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient<Database>;

    const r = await upsertAddressFromValue(db, 'org-1', sampleAddress, null, 'u1');
    expect(r.id).toBe('addr-new');
  });

  it('updates when an existing row is provided', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq })),
      })),
    } as unknown as SupabaseClient<Database>;

    const existing = {
      id: 'addr-1',
      place_id: 'manual:abc',
      full_address: 'Old',
      street_number: null,
      route: 'Old',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
      lat: null,
      lng: null,
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
      organisation_id: 'org-1',
    } as unknown as CoreAddressRow;

    const r = await upsertAddressFromValue(db, 'org-1', sampleAddress, existing, 'u1');
    expect(r.id).toBe('addr-1');
  });
});

describe('persistProfileWizardStep1', () => {
  it('persists residential address and updates person phones', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'addr-r' }, error: null });
    const personEq = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'core_address') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        };
      }
      if (table === 'core_person') {
        return {
          update: vi.fn(() => ({ eq: personEq })),
        };
      }
      if (table === 'core_phone') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const db = { from } as unknown as SupabaseClient<Database>;

    await persistProfileWizardStep1({
      db,
      organisationId: 'org-1',
      userId: 'u1',
      personId: 'p1',
      values: {
        residential: sampleAddress,
        postal_same_as_residential: true,
        postal: undefined,
        phones: [{ phone_number: '0400 000 000', phone_type_id: 1 }],
      },
      residentialRow: null,
      postalRow: null,
    });

    expect(personEq).toHaveBeenCalled();
  });
});

describe('persistProfileWizardStep2', () => {
  it('updates membership fields', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq })),
      })),
    } as unknown as SupabaseClient<Database>;

    await persistProfileWizardStep2({
      db,
      userId: 'u1',
      memberId: 'm1',
      values: { membership_number: 'N1', membership_type_id: 1 },
      existingMembershipStatus: 'Active',
    });

    expect(eq).toHaveBeenCalled();
  });
});
