import { describe, expect, it } from 'vitest';
import { PORTAL_NAV_ITEMS } from '@/shared/components/portalNav';

describe('PORTAL_NAV_ITEMS', () => {
  it('excludes deferred payment / invoice navigation for the active rebuild wave', () => {
    const blob = PORTAL_NAV_ITEMS.map((i) => `${i.label} ${i.href} ${i.id}`).join(' ').toLowerCase();
    expect(blob).not.toMatch(/payment|invoice|billing/);
  });
});
