import { describe, expect, it } from 'vitest';
import { hasDelegatedEditPermission } from '@/shared/lib/utils/delegatedProfilePermissions';

describe('hasDelegatedEditPermission', () => {
  it('returns true for edit-like permission strings', () => {
    expect(hasDelegatedEditPermission('edit')).toBe(true);
    expect(hasDelegatedEditPermission('admin')).toBe(true);
    expect(hasDelegatedEditPermission('FULL')).toBe(true);
    expect(hasDelegatedEditPermission('  write  ')).toBe(true);
  });

  it('returns false for view-only or unknown permissions', () => {
    expect(hasDelegatedEditPermission('view')).toBe(false);
    expect(hasDelegatedEditPermission('read')).toBe(false);
    expect(hasDelegatedEditPermission('')).toBe(false);
  });
});
