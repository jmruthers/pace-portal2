/** Values accepted by `app_pace_contact_create` / `app_pace_contact_update`. */
export const CONTACT_PERMISSION_VALUES = ['full', 'notify', 'none'] as const;

export type ContactPermissionValue = (typeof CONTACT_PERMISSION_VALUES)[number];

export type ContactPermissionOption = {
  value: ContactPermissionValue;
  label: string;
};

export const CONTACT_PERMISSION_OPTIONS: ReadonlyArray<ContactPermissionOption> = [
  { value: 'full', label: 'Full access' },
  { value: 'notify', label: 'Notify only' },
  { value: 'none', label: 'No access' },
];

const PERMISSION_LABEL_BY_VALUE = new Map(
  CONTACT_PERMISSION_OPTIONS.map((option) => [option.value, option.label])
);

/**
 * Normalizes stored or legacy permission labels to RPC values (`full` | `notify` | `none`).
 */
export function normalizeContactPermissionType(
  permissionType: string | null | undefined
): ContactPermissionValue | null {
  const normalized = (permissionType ?? '').trim().toLowerCase();
  if (normalized === '') {
    return null;
  }
  if (normalized === 'edit' || normalized === 'view') {
    return 'full';
  }
  if (normalized === 'no_access' || normalized === 'no access' || normalized === 'noaccess') {
    return 'none';
  }
  if (
    (CONTACT_PERMISSION_VALUES as ReadonlyArray<string>).includes(normalized)
  ) {
    return normalized as ContactPermissionValue;
  }
  return null;
}

export function contactPermissionLabel(permissionType: string): string {
  const canonical = normalizeContactPermissionType(permissionType);
  if (canonical != null) {
    return PERMISSION_LABEL_BY_VALUE.get(canonical) ?? canonical;
  }
  const trimmed = permissionType.trim();
  return trimmed === '' ? 'Unknown' : trimmed;
}

export function buildContactPermissionOptions(
  contacts: ReadonlyArray<{ permission_type: string }>,
  initialPermission: string
): ReadonlyArray<ContactPermissionOption> {
  const values = new Set<ContactPermissionValue>(CONTACT_PERMISSION_VALUES);

  const addPermission = (raw: string) => {
    const canonical = normalizeContactPermissionType(raw);
    if (canonical != null) {
      values.add(canonical);
    }
  };

  addPermission(initialPermission);
  for (const contact of contacts) {
    addPermission(contact.permission_type);
  }

  return [...values].map((value) => ({
    value,
    label: PERMISSION_LABEL_BY_VALUE.get(value) ?? value,
  }));
}
