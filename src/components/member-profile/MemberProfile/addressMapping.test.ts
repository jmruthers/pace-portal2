import { describe, expect, it } from 'vitest';
import type { AddressValue } from '@solvera/pace-core/forms';
import {
  addressValueToCoreAddressPayload,
  coreAddressRowToAddressValue,
  isAddressValueEmpty,
} from '@/components/member-profile/MemberProfile/addressMapping';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';

function makeRow(partial: Partial<CoreAddressRow>): CoreAddressRow {
  return {
    id: 'a1',
    country: 'AU',
    created_at: '2020-01-01',
    created_by: null,
    full_address: null,
    lat: null,
    lng: null,
    organisation_id: null,
    place_id: 'ChIJx',
    postcode: '2000',
    route: 'George St',
    state: 'NSW',
    street_number: '1',
    suburb: 'Sydney',
    updated_at: null,
    updated_by: null,
    ...partial,
  };
}

describe('addressMapping', () => {
  it('maps core_address row to AddressValue', () => {
    const v = coreAddressRowToAddressValue(
      makeRow({
        place_id: 'place-1',
        full_address: '1 George St, Sydney NSW 2000, Australia',
      })
    );
    expect(v.line1).toContain('1');
    expect(v.locality).toBe('Sydney');
    expect(v.countryCode).toBe('AU');
  });

  it('treats manual place_id as absent placeId in the form', () => {
    const v = coreAddressRowToAddressValue(makeRow({ place_id: 'manual:uuid-here' }));
    expect(v.placeId).toBeUndefined();
  });

  it('builds insert payload with synthetic place_id when missing', () => {
    const value: AddressValue = {
      line1: '10 Test Rd',
      locality: 'Auckland',
      countryCode: 'NZ',
    };
    const p = addressValueToCoreAddressPayload(value);
    expect(p.place_id.startsWith('manual:')).toBe(true);
  });

  it('reuses existing manual place_id when updating manual entry', () => {
    const value: AddressValue = {
      line1: '11 Test Rd',
      locality: 'Auckland',
      countryCode: 'NZ',
    };
    const p = addressValueToCoreAddressPayload(value, { existingPlaceId: 'manual:keep-me' });
    expect(p.place_id).toBe('manual:keep-me');
  });

  it('detects empty address values', () => {
    expect(isAddressValueEmpty(undefined)).toBe(true);
    expect(
      isAddressValueEmpty({
        line1: '  ',
        locality: '',
        countryCode: '',
      })
    ).toBe(true);
  });

  it('includes line2 in full_address for manual entry (no formattedAddress)', () => {
    const value: AddressValue = {
      line1: '10 Test Rd',
      line2: 'Unit 2',
      locality: 'Auckland',
      countryCode: 'NZ',
    };
    const p = addressValueToCoreAddressPayload(value);
    expect(p.full_address).toContain('Unit 2');
    expect(p.full_address).toContain('10 Test Rd');
  });

  it('merges line2 into full_address when formattedAddress is present', () => {
    const value: AddressValue = {
      line1: '10 Test Rd',
      line2: 'Unit 2',
      locality: 'Auckland',
      countryCode: 'NZ',
      formattedAddress: '10 Test Rd, Auckland, New Zealand',
    };
    const p = addressValueToCoreAddressPayload(value);
    expect(p.full_address).toContain('Unit 2');
    expect(p.full_address).toContain('Auckland');
  });
});
