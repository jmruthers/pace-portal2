/**
 * Dashboard event card logos: pick latest `core_file_references` row per event (PR14).
 * Contract: table_name = core_events, file_metadata.category = event_logo/event_logos
 * (or path contains /event_logo/ or /event_logos/).
 */

export type EventLogoRefRow = {
  record_id: string;
  file_path: string;
  is_public: boolean | null;
  file_metadata: unknown;
  created_at: string | null;
};

function categoryFromMetadata(file_metadata: unknown): string {
  if (file_metadata === null || typeof file_metadata !== 'object' || Array.isArray(file_metadata)) {
    return '';
  }
  const c = (file_metadata as { category?: unknown }).category;
  return typeof c === 'string' ? c : '';
}

/** Whether this row is an event logo file reference (matches pace-core SQL helper semantics). */
export function isEventLogoRow(r: Pick<EventLogoRefRow, 'file_path' | 'file_metadata'>): boolean {
  const cat = categoryFromMetadata(r.file_metadata);
  if (
    cat === 'event_logo' ||
    cat === 'EVENT_LOGO' ||
    cat === 'event_logos' ||
    cat === 'EVENT_LOGOS'
  ) {
    return true;
  }
  return (
    r.file_path.includes('/event_logo/') ||
    r.file_path.includes('/event_logos/') ||
    r.file_path.includes('event-logos/')
  );
}

/** Latest row per record_id by created_at (desc). */
export function pickLatestEventLogoByEventId(refs: EventLogoRefRow[]): Map<string, EventLogoRefRow> {
  const filtered = refs.filter((r) => isEventLogoRow(r));
  filtered.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  const byEvent = new Map<string, EventLogoRefRow>();
  for (const r of filtered) {
    if (!byEvent.has(r.record_id)) byEvent.set(r.record_id, r);
  }
  return byEvent;
}
