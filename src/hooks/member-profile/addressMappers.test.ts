import { describe, expect, it } from 'vitest';
import type { Database } from '@/types/pace-database';
import { addressRowToAddressValue } from '@/hooks/member-profile/addressMappers';

type AddressRow = Database['public']['Tables']['core_address']['Row'];

describe('addressRowToAddressValue', () => {
  it('builds line1 from street number and route', () => {
    const v = addressRowToAddressValue({
      id: 'a1',
      place_id: 'ChIJ123',
      organisation_id: 'o1',
      full_address: '1 Test St, Sydney NSW',
      street_number: '1',
      route: 'Test St',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    } as unknown as AddressRow);
    expect(v.line1).toContain('1');
    expect(v.placeId).toBe('ChIJ123');
    expect(v.countryCode).toBe('AU');
  });

  it('uses route-only line1 and omits placeId for manual place ids', () => {
    const v = addressRowToAddressValue({
      id: 'a2',
      place_id: 'manual-abc',
      organisation_id: 'o1',
      full_address: null,
      street_number: null,
      route: 'Back Rd',
      suburb: 'X',
      state: null,
      postcode: null,
      country: 'au',
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    } as unknown as AddressRow);
    expect(v.line1).toBe('Back Rd');
    expect(v.placeId).toBeUndefined();
    expect(v.countryCode).toBe('AU');
  });

  it('derives line1 from full_address when route is empty', () => {
    const v = addressRowToAddressValue({
      id: 'a3',
      place_id: 'manual-x',
      organisation_id: 'o1',
      full_address: '99 Lane, Suburb',
      street_number: null,
      route: null,
      suburb: 'Suburb',
      state: null,
      postcode: null,
      country: 'NZ',
      created_at: null,
      created_by: null,
      deleted_at: null,
      updated_at: null,
      updated_by: null,
    } as unknown as AddressRow);
    expect(v.line1).toBe('99 Lane');
    expect(v.countryCode).toBe('NZ');
  });
});
