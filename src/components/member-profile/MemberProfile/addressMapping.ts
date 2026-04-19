import type { AddressValue } from '@solvera/pace-core/forms';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';

function countryToCode(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') {
    return '';
  }
  const t = raw.trim();
  if (t.length === 2) {
    return t.toUpperCase();
  }
  if (t.length >= 2) {
    return t.slice(0, 2).toUpperCase();
  }
  return '';
}

/**
 * Maps a `core_address` row into {@link AddressValue} for `AddressField`.
 */
export function coreAddressRowToAddressValue(row: CoreAddressRow): AddressValue {
  const street = [row.street_number, row.route].filter(Boolean).join(' ').trim();
  const line1 =
    street.length > 0
      ? street
      : (row.full_address?.split(',')[0]?.trim() ?? row.full_address ?? '').trim();

  return {
    line1: line1.length > 0 ? line1 : '—',
    locality: row.suburb?.trim() !== '' ? (row.suburb ?? '') : row.state?.trim() !== '' ? (row.state ?? '') : '—',
    region: row.state ?? undefined,
    postalCode: row.postcode ?? undefined,
    countryCode: countryToCode(row.country) || 'AU',
    placeId: row.place_id.startsWith('manual:') ? undefined : row.place_id,
    formattedAddress: row.full_address ?? undefined,
  };
}

export type CoreAddressWritePayload = {
  place_id: string;
  full_address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  street_number: string | null;
  route: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Builds insert/update payload for `core_address` from an {@link AddressValue}.
 * When `placeId` is absent (manual entry), a stable synthetic `place_id` is generated.
 */
export function addressValueToCoreAddressPayload(
  value: AddressValue,
  options?: { existingPlaceId?: string | null }
): CoreAddressWritePayload {
  const trimmedPlace = value.placeId?.trim() ?? '';
  const existingManual =
    options?.existingPlaceId != null && String(options.existingPlaceId).trim() !== ''
      ? String(options.existingPlaceId).trim()
      : null;
  const place_id =
    trimmedPlace !== '' ? trimmedPlace : (existingManual ?? `manual:${crypto.randomUUID()}`);

  const line1 = value.line1.trim();
  const line2Trim = (value as AddressValue & { line2?: string }).line2?.trim() ?? '';
  const streetLine = [line1, line2Trim].filter((s) => s !== '').join(', ');
  const locality = value.locality.trim();
  const region = value.region?.trim();
  const postal = value.postalCode?.trim();
  const country = value.countryCode?.trim();
  const parts = [streetLine, locality, region, postal, country]
    .filter((p) => p != null && String(p).trim() !== '')
    .map(String);
  const formatted = value.formattedAddress?.trim();
  let full_address: string;
  if (formatted != null && formatted !== '') {
    if (line2Trim !== '') {
      if (formatted.startsWith(line1)) {
        full_address = `${streetLine}${formatted.slice(line1.length)}`;
      } else {
        full_address = `${streetLine}, ${formatted}`;
      }
    } else {
      full_address = formatted;
    }
  } else {
    full_address = parts.join(', ');
  }
  return {
    place_id,
    full_address: full_address.length > 0 ? full_address : line1,
    suburb: locality.length > 0 ? locality : null,
    state: region != null && region !== '' ? region : null,
    postcode: postal != null && postal !== '' ? postal : null,
    country: value.countryCode.trim() !== '' ? value.countryCode.trim().toUpperCase() : null,
    street_number: null,
    route: null,
    lat: null,
    lng: null,
  };
}

export function isAddressValueEmpty(value: AddressValue | undefined | null): boolean {
  if (value == null) {
    return true;
  }
  return (
    value.line1.trim() === '' &&
    value.locality.trim() === '' &&
    (value.countryCode?.trim() ?? '') === ''
  );
}
