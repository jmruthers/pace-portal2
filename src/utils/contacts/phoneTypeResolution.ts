export type PhoneTypeLookupRow = {
  id: number;
  name: string;
};

/**
 * Maps a phone-type display label from list/RPC data to `core_phone_type.id` for form selects.
 */
export function resolvePhoneTypeIdFromLabel(
  phoneTypeLabel: string | null | undefined,
  phoneTypes: ReadonlyArray<PhoneTypeLookupRow>
): number | null {
  const trimmed = (phoneTypeLabel ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  const normalized = trimmed.toLowerCase();
  const match = phoneTypes.find((row) => row.name.trim().toLowerCase() === normalized);
  return match?.id ?? null;
}
