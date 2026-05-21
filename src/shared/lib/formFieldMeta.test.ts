import { describe, expect, it } from 'vitest';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import {
  buildCatalogueIndex,
  buildConfirmationZodSchema,
  buildFormFieldMeta,
  parseFieldKey,
  resolveRegistryFieldType,
} from '@/shared/lib/formFieldMeta';
import { composeDynamicFormSchema, createEventFormFieldRegistry } from '@/shared/lib/formFieldRegistry';
import type { CoreFieldCatalogueRow, CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

function minimalFieldRow(overrides: Partial<CoreFormFieldRow>): CoreFormFieldRow {
  return {
    id: 'ff-1',
    form_id: 'form-1',
    organisation_id: 'org-1',
    field_key: 'person.first_name',
    field_label: 'First name',
    sort_order: 1,
    is_active: true,
    is_required: true,
    display_options: null,
    validation_rules: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  } as CoreFormFieldRow;
}

describe('formFieldMeta', () => {
  it('parseFieldKey handles dotted keys and rejects invalid shapes', () => {
    expect(parseFieldKey('person.first_name')).toEqual({
      domain: 'person',
      columnPath: 'first_name',
    });
    expect(parseFieldKey('nodot')).toBeNull();
    expect(parseFieldKey('.leading')).toBeNull();
  });

  it('resolveRegistryFieldType prefers display_options then catalogue', () => {
    expect(resolveRegistryFieldType(undefined, { component: 'checkbox', type: 'text' })).toBe('checkbox');
    expect(
      resolveRegistryFieldType({ field_type: 'boolean' } as CoreFieldCatalogueRow, null)
    ).toBe('checkbox');
    expect(resolveRegistryFieldType(undefined, null)).toBe('text');
  });

  it('buildConfirmationZodSchema rejects false and accepts true', () => {
    const conf = buildConfirmationZodSchema(['member_profile']);
    expect(conf.safeParse({ member_profile: false }).success).toBe(false);
    expect(conf.safeParse({ member_profile: true }).success).toBe(true);
  });

  it('composeDynamicFormSchema supports optional vs required without throwing for unknown types', () => {
    const registry = createEventFormFieldRegistry();
    const requiredText = minimalFieldRow({
      id: 'a',
      field_key: 'person.first_name',
      is_required: true,
    });
    const optionalText = minimalFieldRow({
      id: 'b',
      field_key: 'person.last_name',
      is_required: false,
    });
    const metas: FormFieldMeta[] = [
      buildFormFieldMeta(requiredText, buildCatalogueIndex([])),
      buildFormFieldMeta(optionalText, buildCatalogueIndex([])),
    ];
    // Force an unregistered field type via manual meta (fallback path in CR20).
    metas.push({
      ...metas[0],
      id: 'c',
      fieldKey: 'custom.x',
      fieldType: 'totally_unknown_for_test',
      required: false,
    });

    const schema = composeDynamicFormSchema(registry, metas);
    const parsedOk = schema.safeParse({ a: 'hi', b: '', c: '' });
    expect(parsedOk.success).toBe(true);

    const parsedMissingRequired = schema.safeParse({ a: '', b: '' });
    expect(parsedMissingRequired.success).toBe(false);
  });

  it('nests confirmations alongside dynamic fields when extended manually', () => {
    const registry = createEventFormFieldRegistry();
    const meta = buildFormFieldMeta(minimalFieldRow({ id: 'f1' }), buildCatalogueIndex([]));
    const dynamic = composeDynamicFormSchema(registry, [meta]);
    const full = dynamic.extend({
      confirmations: buildConfirmationZodSchema(['member_profile']),
    });
    const bad = full.safeParse({ f1: 'x', confirmations: { member_profile: false } });
    expect(bad.success).toBe(false);
    const good = full.safeParse({ f1: 'x', confirmations: { member_profile: true } });
    expect(good.success).toBe(true);
  });
});
