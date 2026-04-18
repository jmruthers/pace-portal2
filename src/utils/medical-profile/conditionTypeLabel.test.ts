import { describe, expect, it } from 'vitest';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';

describe('buildConditionTypePathLabel', () => {
  it('builds hierarchical path from parent chain', () => {
    const types = [
      { id: 1, name: 'A', parent_id: null, is_active: true } as never,
      { id: 2, name: 'B', parent_id: 1, is_active: true } as never,
    ];
    expect(buildConditionTypePathLabel(2, types)).toBe('A › B');
  });

  it('returns empty when id is unknown', () => {
    expect(buildConditionTypePathLabel(99, [])).toBe('');
  });
});
