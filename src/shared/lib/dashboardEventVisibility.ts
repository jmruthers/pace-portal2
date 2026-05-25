import type { Database } from '@/types/pace-database';

/** Subset of `core_forms` used to decide dashboard event eligibility (PR14). */
export type FormRowForDashboardVisibility = Pick<
  Database['public']['Tables']['core_forms']['Row'],
  'event_id' | 'status' | 'is_active' | 'opens_at' | 'closes_at'
>;

/**
 * Whether an event should appear on the dashboard: published, active, tied to an event.
 * Response window (`opens_at` / `closes_at`) does not affect listing — only apply/fill access.
 */
export function isDashboardListedForm(form: FormRowForDashboardVisibility): boolean {
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
  return true;
}

/**
 * Whether a published event form accepts responses now (application/fill routes and hub form links).
 */
export function isFormResponseWindowOpen(
  form: FormRowForDashboardVisibility,
  now: Date
): boolean {
  if (!isDashboardListedForm(form)) {
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

/** @deprecated Use {@link isFormResponseWindowOpen}. */
export function isDashboardEligibleForm(
  form: FormRowForDashboardVisibility,
  now: Date
): boolean {
  return isFormResponseWindowOpen(form, now);
}

/** Distinct `event_id` values that have at least one dashboard-listed form. */
export function distinctListedEventIds(forms: FormRowForDashboardVisibility[]): string[] {
  const ids = new Set<string>();
  for (const f of forms) {
    if (isDashboardListedForm(f)) {
      ids.add(String(f.event_id));
    }
  }
  return [...ids];
}

/** @deprecated Use {@link distinctListedEventIds}. */
export function distinctEligibleEventIds(
  forms: FormRowForDashboardVisibility[],
  now: Date
): string[] {
  void now;
  return distinctListedEventIds(forms);
}

/** True when at least one listed form for the event accepts responses at `now`. */
export function buildFormResponseOpenByEventId(
  forms: FormRowForDashboardVisibility[],
  now: Date
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of forms) {
    if (!isFormResponseWindowOpen(f, now)) {
      continue;
    }
    out[String(f.event_id)] = true;
  }
  return out;
}
