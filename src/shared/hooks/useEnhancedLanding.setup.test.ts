import { describe, expect, it } from 'vitest';
import { createEmptyEnhancedLandingModel } from '@/shared/hooks/useEnhancedLanding';

describe('createEmptyEnhancedLandingModel', () => {
  it('returns setup model with no person', () => {
    const m = createEmptyEnhancedLandingModel(true);
    expect(m.person).toBeNull();
    expect(m.needsProfileSetup).toBe(true);
    expect(m.eventsByCategory).toEqual({});
  });
});
