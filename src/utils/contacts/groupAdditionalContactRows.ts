import type { AdditionalContactRow } from '@/shared/hooks/useEnhancedLanding';

/**
 * Flat row shape shared by `data_pace_contacts_list` and `data_pace_member_contacts_list`
 * (member RPC adds `access_level`).
 */
export type FlatContactRpcRow = AdditionalContactRow & {
  access_level?: string;
};

export type GroupedContactPhone = {
  phone_number: string;
  phone_type: string;
};

/**
 * One card-level contact after grouping duplicate RPC rows that differ only by phone line.
 */
export type GroupedAdditionalContact = {
  contact_id: string;
  contact_person_id: string;
  contact_type_id: number;
  contact_type_name: string;
  email: string;
  first_name: string;
  last_name: string;
  member_id: string;
  organisation_id: string;
  permission_type: string;
  /** Present when loaded via `data_pace_member_contacts_list` (proxy/delegated). */
  access_level?: string;
  phones: GroupedContactPhone[];
};

/**
 * Groups flat RPC rows by `contact_id`, aggregating `phone_number` / `phone_type` into `phones`.
 * Preserves the legacy portal grouping contract (one card per contact, multiple phone lines).
 */
export function groupFlatContactRows(rows: ReadonlyArray<FlatContactRpcRow>): GroupedAdditionalContact[] {
  const map = new Map<string, GroupedAdditionalContact>();

  for (const row of rows) {
    const id = row.contact_id;
    const phoneEntry: GroupedContactPhone = {
      phone_number: row.phone_number ?? '',
      phone_type: row.phone_type ?? '',
    };

    const existing = map.get(id);
    if (!existing) {
      map.set(id, {
        contact_id: row.contact_id,
        contact_person_id: row.contact_person_id,
        contact_type_id: row.contact_type_id,
        contact_type_name: row.contact_type_name,
        email: row.email ?? '',
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        member_id: row.member_id,
        organisation_id: row.organisation_id,
        permission_type: row.permission_type ?? '',
        access_level: row.access_level,
        phones: [phoneEntry],
      });
    } else {
      existing.phones.push(phoneEntry);
      if (row.access_level !== undefined && existing.access_level === undefined) {
        existing.access_level = row.access_level;
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
    const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return a.contact_id.localeCompare(b.contact_id);
  });
}
