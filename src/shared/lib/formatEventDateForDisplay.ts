/**
 * Display helper for event `event_date` ISO strings. pace-core does not export a public date formatter;
 * keep one shared helper for portal event surfaces.
 */
export function formatEventDateForDisplay(isoDate: string | null | undefined): string {
  if (isoDate == null) return '';
  const t = String(isoDate).trim();
  if (!t) return '';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString();
}
