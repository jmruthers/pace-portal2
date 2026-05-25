import { describe, expect, it } from 'vitest';
import {
  buildContactPermissionOptions,
  contactPermissionLabel,
  normalizeContactPermissionType,
} from '@/utils/contacts/permissionTypes';

describe('normalizeContactPermissionType', () => {
  it('maps legacy view/edit to full', () => {
    expect(normalizeContactPermissionType('view')).toBe('full');
    expect(normalizeContactPermissionType('edit')).toBe('full');
  });

  it('maps no-access aliases to none', () => {
    expect(normalizeContactPermissionType('no_access')).toBe('none');
  });

  it('returns canonical RPC values', () => {
    expect(normalizeContactPermissionType('notify')).toBe('notify');
    expect(normalizeContactPermissionType('FULL')).toBe('full');
  });
});

describe('buildContactPermissionOptions', () => {
  it('always includes full, notify, and none', () => {
    const options = buildContactPermissionOptions([], '');
    expect(options.map((o) => o.value)).toEqual(['full', 'notify', 'none']);
  });

  it('includes legacy values from existing contacts after normalization', () => {
    const options = buildContactPermissionOptions([{ permission_type: 'view' }], 'view');
    expect(options.map((o) => o.value)).toEqual(['full', 'notify', 'none']);
  });
});

describe('contactPermissionLabel', () => {
  it('returns human-readable labels for canonical values', () => {
    expect(contactPermissionLabel('full')).toBe('Full access');
    expect(contactPermissionLabel('view')).toBe('Full access');
  });
});
