import { describe, expect, it } from 'vitest';
import { deriveEventDashboardAction } from '@/hooks/events/eventDashboardAction';

describe('deriveEventDashboardAction', () => {
  it('returns Apply without status', () => {
    expect(deriveEventDashboardAction(undefined)).toEqual({
      intent: 'apply',
      label: 'Apply',
    });
    expect(deriveEventDashboardAction(null)).toEqual({
      intent: 'apply',
      label: 'Apply',
    });
    expect(deriveEventDashboardAction('')).toEqual({
      intent: 'apply',
      label: 'Apply',
    });
  });

  it('returns Resume for draft status case-insensitively', () => {
    expect(deriveEventDashboardAction('draft')).toEqual({ intent: 'resume', label: 'Resume' });
    expect(deriveEventDashboardAction('Draft')).toEqual({ intent: 'resume', label: 'Resume' });
    expect(deriveEventDashboardAction('DRAFT')).toEqual({ intent: 'resume', label: 'Resume' });
  });

  it('returns Manage for any non-draft status', () => {
    expect(deriveEventDashboardAction('approved')).toEqual({ intent: 'manage', label: 'Manage' });
    expect(deriveEventDashboardAction('under_review')).toEqual({ intent: 'manage', label: 'Manage' });
  });
});
