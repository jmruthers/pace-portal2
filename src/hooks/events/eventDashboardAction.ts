export type EventDashboardCtaIntent = 'apply' | 'resume' | 'manage';

export type EventDashboardAction = {
  intent: EventDashboardCtaIntent;
  /** Participant-visible CTA label */
  label: string;
};

/**
 * PR14 dashboard event cards: derives Apply / Resume / Manage from optional `base_application.status`.
 */
export function deriveEventDashboardAction(
  applicationStatus: string | null | undefined
): EventDashboardAction {
  const s =
    typeof applicationStatus === 'string' && applicationStatus.trim() !== ''
      ? applicationStatus.trim()
      : null;
  if (s == null) {
    return { intent: 'apply', label: 'Apply' };
  }
  if (s.toLowerCase() === 'draft') {
    return { intent: 'resume', label: 'Resume' };
  }
  return { intent: 'manage', label: 'Manage' };
}
