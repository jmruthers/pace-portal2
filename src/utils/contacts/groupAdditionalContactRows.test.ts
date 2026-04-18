import { describe, expect, it } from 'vitest';
import {
  groupFlatContactRows,
  type FlatContactRpcRow,
} from '@/utils/contacts/groupAdditionalContactRows';

function row(partial: Partial<FlatContactRpcRow> & Pick<FlatContactRpcRow, 'contact_id'>): FlatContactRpcRow {
  return {
    contact_person_id: 'cp1',
    contact_type_id: 1,
    contact_type_name: 'Emergency',
    email: 'a@b.c',
    first_name: 'A',
    last_name: 'B',
    member_id: 'm1',
    organisation_id: 'o1',
    permission_type: 'view',
    phone_number: '',
    phone_type: '',
    ...partial,
  };
}

describe('groupFlatContactRows', () => {
  it('groups duplicate contact_id rows into one card with multiple phones', () => {
    const grouped = groupFlatContactRows([
      row({
        contact_id: 'c1',
        phone_number: '111',
        phone_type: 'Mobile',
      }),
      row({
        contact_id: 'c1',
        phone_number: '222',
        phone_type: 'Home',
      }),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.phones).toHaveLength(2);
    expect(grouped[0]?.phones[0]).toEqual({ phone_number: '111', phone_type: 'Mobile' });
    expect(grouped[0]?.phones[1]).toEqual({ phone_number: '222', phone_type: 'Home' });
  });

  it('keeps separate contacts for different contact_id values', () => {
    const grouped = groupFlatContactRows([
      row({ contact_id: 'c1', first_name: 'A', last_name: 'One', phone_number: '1', phone_type: 'M' }),
      row({ contact_id: 'c2', first_name: 'B', last_name: 'Two', phone_number: '2', phone_type: 'H' }),
    ]);
    expect(grouped).toHaveLength(2);
  });
});
