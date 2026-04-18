import type { Database } from '@/types/pace-database';

/** Subset of `core_forms` used to decide dashboard event eligibility (PR14). */
export type FormRowForDashboardVisibility = Pick<
  Database['public']['Tables']['core_forms']['Row'],
  'event_id' | 'status' | 'is_active' | 'opens_at' | 'closes_at'
>;

/**
 * Whether a form counts as “open” for dashboard event cards: published, active, in window, tied to an event.
 */
export function isDashboardEligibleForm(form: FormRowForDashboardVisibility, now: Date): boolean {
  const eventId = form.event_id;
  if (eventId == null || String(eventId).trim() === '') {
    return false;
  }
  if (form.status !== 'published') {
    return false;
  }
  if (form.is_active === false) {
    return false;
  }
  const t = now.getTime();
  if (form.opens_at != null && form.opens_at !== '') {
    const opens = Date.parse(form.opens_at);
    if (Number.isFinite(opens) && opens > t) {
      return false;
    }
  }
  if (form.closes_at != null && form.closes_at !== '') {
    const closes = Date.parse(form.closes_at);
    if (Number.isFinite(closes) && closes < t) {
      return false;
    }
  }
  return true;
}

/** Distinct `event_id` values that have at least one eligible form at `now`. */
export function distinctEligibleEventIds(
  forms: FormRowForDashboardVisibility[],
  now: Date
): string[] {
  const ids = new Set<string>();
  for (const f of forms) {
    if (isDashboardEligibleForm(f, now)) {
      ids.add(String(f.event_id));
    }
  }
  return [...ids];
}
