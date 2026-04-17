import type { AddressValue } from '@solvera/pace-core/forms';
import type { Database } from '@/types/pace-database';

type AddressRow = Database['public']['Tables']['core_address']['Row'];

/**
 * Maps a stored `core_address` row to {@link AddressValue} for AddressField / Zod.
 */
export function addressRowToAddressValue(row: AddressRow): AddressValue {
  const line1 =
    row.street_number && row.route
      ? `${row.street_number} ${row.route}`.trim()
      : (row.route ?? row.full_address?.split(',')[0]?.trim() ?? '').trim();
  const country = row.country?.trim() ?? '';
  const cc = country.length >= 2 ? country.slice(0, 2).toUpperCase() : 'AU';
  const isManual = row.place_id.startsWith('manual-');
  return {
    line1: line1.length > 0 ? line1 : '—',
    locality: row.suburb?.trim() ?? '',
    region: row.state?.trim() ?? undefined,
    postalCode: row.postcode?.trim() ?? undefined,
    countryCode: cc,
    placeId: isManual ? undefined : row.place_id,
    formattedAddress: row.full_address?.trim() ?? undefined,
  };
}
