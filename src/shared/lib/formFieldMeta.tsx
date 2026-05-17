/**
 * Dynamic form field metadata + portal field registry (PR15).
 * Field catalogue typing and DB row alias exported for hooks and tests.
 */
/* eslint-disable pace-core-compliance/max-named-exports -- Single module for metadata helpers and registry; splitting would scatter CR20 glue. */
import { Controller } from '@solvera/pace-core/forms';
import {
  composeSchemaFromFieldMetadata,
  createDefaultFieldRegistryEntries,
  createFieldRegistry,
  type FormFieldMeta,
} from '@solvera/pace-core/forms';
import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { z } from '@solvera/pace-core/utils';
import type { Database } from '@/types/pace-database';

export type CoreFieldCatalogueRow =
  Database['public']['Functions']['data_core_field_list_core_form']['Returns'][number];

export type CoreFormFieldRow = Database['public']['Tables']['core_form_fields']['Row'];

/**
 * Parses `field_key` (e.g. `person.first_name`) into table/column semantics for catalogue + prefill.
 */
export function parseFieldKey(fieldKey: string): { domain: string; columnPath: string } | null {
  const t = fieldKey.trim();
  const i = t.indexOf('.');
  if (i <= 0 || i === t.length - 1) return null;
  return { domain: t.slice(0, i), columnPath: t.slice(i + 1) };
}

/** Maps `field_key` domain prefix to a physical table name when prefill is supported. */
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
  if (t === 'select' || c === 'select') return 'select';
  if (t === 'text' || c === 'input') return 'text';
  return null;
}

/**
 * Resolves CR20 registry `fieldType` from catalogue row + `core_form_fields.display_options`.
 */
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

/** Builds {@link FormFieldMeta} for one `core_form_fields` row. */
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

  const fieldType = resolveRegistryFieldType(catalogue, row.display_options);

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

/** Zod shape for workflow pre-submission confirmation checkboxes (PR15). */
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

export type EventFormRegistry = ReturnType<typeof createEventFormFieldRegistry>;

function buildCheckboxSchema(meta: FormFieldMeta): z.ZodTypeAny {
  if (meta.required === false) {
    return z.boolean().optional();
  }
  return z.boolean().refine((v) => v === true, { message: 'Required' });
}

function buildSelectSchema(meta: FormFieldMeta): z.ZodTypeAny {
  const base = z.string();
  return meta.required === false ? base.optional() : base.min(1, 'Required');
}

/**
 * CR20 registry extended with checkbox + select (portal seeds / catalogue types).
 */
export function createEventFormFieldRegistry() {
  return createFieldRegistry({
    entries: [
      ...createDefaultFieldRegistryEntries(),
      {
        fieldType: 'checkbox',
        buildSchema: buildCheckboxSchema,
        render: ({ meta, control, name }) => (
          <Controller
            name={name as never}
            control={control}
            render={({ field, fieldState }) => (
                <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                  <Checkbox
                    id={`ff-${String(name)}`}
                    checked={Boolean(field.value)}
                    onChange={(next) => field.onChange(next)}
                    aria-invalid={fieldState.error != null}
                  />
                  <p>
                    {meta.label ?? meta.id}
                    {meta.required !== false ? ' *' : null}
                  </p>
                </Label>
            )}
          />
        ),
      },
      {
        fieldType: 'select',
        buildSchema: buildSelectSchema,
        render: ({ meta, control, name }) => {
          const options = Array.isArray(meta.options) ? meta.options : [];
          return (
            <Controller
              name={name as never}
              control={control}
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  {meta.label ?? meta.id}
                  {meta.required !== false ? ' *' : null}
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.error != null}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
              )}
            />
          );
        },
      },
    ],
  });
}

export function composeDynamicFormSchema(registry: EventFormRegistry, fields: FormFieldMeta[]) {
  return composeSchemaFromFieldMetadata(registry, fields);
}
