import type { FormFieldMeta } from '@solvera/pace-core/forms';

function emptyAddress() {
  return {
    line1: '',
    line2: '',
    locality: '',
    region: '',
    postalCode: '',
    countryCode: '',
  };
}

export function computeFormRendererDefaultValues(
  fieldMetas: FormFieldMeta[],
  fieldDefaults: Record<string, unknown>,
  draftValues: Record<string, unknown>,
  confirmationKeys: string[],
  confirmationsReadOnlyTreatedAsAcknowledged: boolean
): Record<string, unknown> {
  const conf: Record<string, boolean> = {};
  for (const k of confirmationKeys) {
    conf[k] = confirmationsReadOnlyTreatedAsAcknowledged;
  }
  const out: Record<string, unknown> = { confirmations: conf };
  for (const m of fieldMetas) {
    const v = draftValues[m.id] ?? fieldDefaults[m.id];
    if (m.fieldType === 'address') {
      out[m.id] =
        v != null && typeof v === 'object' && !Array.isArray(v) ? v : emptyAddress();
    } else if (m.fieldType === 'checkbox') {
      out[m.id] = v === true || v === 'true';
    } else {
      out[m.id] = v == null || v === '' ? '' : String(v);
    }
  }
  return out;
}
