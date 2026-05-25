/**
 * Dynamic form field metadata helpers (PR15).
 */
import { z } from '@solvera/pace-core/utils';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import type { Database } from '@/types/pace-database';

export type CoreFieldCatalogueRow =
  Database['public']['Functions']['data_core_field_list_core_form']['Returns'][number];

export type CoreFormFieldRow = Database['public']['Tables']['core_form_fields']['Row'];

export function parseFieldKey(fieldKey: string): { domain: string; columnPath: string } | null {
  const t = fieldKey.trim();
  const i = t.indexOf('.');
  if (i <= 0 || i === t.length - 1) return null;
  return { domain: t.slice(0, i), columnPath: t.slice(i + 1) };
}

export function domainToTableName(domain: string): string | null {
  switch (domain) {
    case 'person':
      return 'core_person';
    case 'member':
      return 'core_member';
    case 'application':
      return 'base_application';
    case 'medi':
    case 'medical':
    case 'medi_profile':
      return 'medi_profile';
    default:
      return null;
  }
}

function normaliseCatalogueFieldType(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.includes('textarea') || s.includes('text_area')) return 'textarea';
  if (s.includes('bool') || s === 'checkbox' || s === 'toggle') return 'checkbox';
  if (s.includes('address')) return 'address';
  if (s.includes('date') || s === 'timestamp') return 'date';
  if (s.includes('select') || s.includes('enum') || s.includes('dropdown')) return 'select';
  if (s.includes('text') || s === 'string' || s === 'varchar') return 'text';
  return 'text';
}

function displayOptionsFieldType(opts: unknown): string | null {
  if (opts == null || typeof opts !== 'object' || Array.isArray(opts)) return null;
  const o = opts as Record<string, unknown>;
  const type = o.type;
  const component = o.component;
  const t = typeof type === 'string' ? type.toLowerCase() : '';
  const c = typeof component === 'string' ? component.toLowerCase() : '';
  if (t === 'textarea' || c === 'textarea') return 'textarea';
  if (t === 'checkbox' || c === 'checkbox') return 'checkbox';
  if (t === 'address' || c === 'address') return 'address';
  if (t === 'date' || c === 'date' || c === 'datepicker') return 'date';
  if (t === 'select' || c === 'select') return 'select';
  if (t === 'text' || c === 'input') return 'text';
  return null;
}

export function resolveRegistryFieldType(
  catalogueRow: CoreFieldCatalogueRow | undefined,
  displayOptions: unknown
): string {
  const fromDisplay = displayOptionsFieldType(displayOptions);
  if (fromDisplay) return fromDisplay;
  if (catalogueRow?.field_type) {
    return normaliseCatalogueFieldType(catalogueRow.field_type);
  }
  return 'text';
}

export function buildFormFieldMeta(
  row: CoreFormFieldRow,
  catalogueByTableColumn: Map<string, CoreFieldCatalogueRow>
): FormFieldMeta {
  const parsed = parseFieldKey(row.field_key);
  let catalogue: CoreFieldCatalogueRow | undefined;
  if (parsed) {
    const table = domainToTableName(parsed.domain);
    if (table) {
      catalogue = catalogueByTableColumn.get(keyTableColumn(table, parsed.columnPath));
    }
  }

  const fieldTypeFromCatalogue = resolveRegistryFieldType(catalogue, row.display_options);
  const fieldType =
    parsed?.columnPath === 'date_of_birth' && fieldTypeFromCatalogue === 'text'
      ? 'date'
      : fieldTypeFromCatalogue;

  const meta: FormFieldMeta = {
    id: row.id,
    fieldType,
    fieldKey: row.field_key,
    label: row.field_label ?? row.field_key,
    required: row.is_required !== false,
    sortOrder: row.sort_order,
    validationRules: row.validation_rules,
    displayOptions: row.display_options,
  };

  if (
    fieldType === 'select' &&
    row.display_options != null &&
    typeof row.display_options === 'object' &&
    !Array.isArray(row.display_options)
  ) {
    const rawOpts = (row.display_options as Record<string, unknown>).options;
    if (Array.isArray(rawOpts)) {
      meta.options = rawOpts.filter(
        (x): x is { value: string; label: string } =>
          x != null &&
          typeof x === 'object' &&
          'value' in x &&
          typeof (x as { value: unknown }).value === 'string' &&
          'label' in x &&
          typeof (x as { label: unknown }).label === 'string'
      );
    }
  }

  return meta;
}

export function keyTableColumn(tableName: string, fieldName: string): string {
  return `${tableName}\0${fieldName}`;
}

export function buildCatalogueIndex(
  rows: CoreFieldCatalogueRow[] | null | undefined
): Map<string, CoreFieldCatalogueRow> {
  const m = new Map<string, CoreFieldCatalogueRow>();
  for (const r of rows ?? []) {
    m.set(keyTableColumn(r.table_name, r.field_name), r);
  }
  return m;
}

export function buildConfirmationZodSchema(keys: string[]) {
  if (keys.length === 0) {
    return z.object({});
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const k of keys) {
    shape[k] = z.boolean().refine((v) => v === true, { message: 'Please confirm to continue.' });
  }
  return z.object(shape);
}
