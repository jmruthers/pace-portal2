/**
 * Dashboard event card logos: pick latest core_file_references row per event and resolve storage URLs.
 * Contract: table_name = core_events, file_metadata.category = event_logo/event_logos
 * (or path contains /event_logo/ or /event_logos/).
 */

export const DEFAULT_EVENT_LOGO_BUCKET = 'public-files';

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

function bucketFromMetadata(file_metadata: unknown): string {
  if (file_metadata === null || typeof file_metadata !== 'object' || Array.isArray(file_metadata)) {
    return DEFAULT_EVENT_LOGO_BUCKET;
  }
  const b = (file_metadata as { bucket?: unknown }).bucket;
  return typeof b === 'string' && b.length > 0 ? b : DEFAULT_EVENT_LOGO_BUCKET;
}

export type StorageBucketApi = {
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  createSignedUrl?: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
};

/** Resolve display URL for one logo row (sync public URL, async signed). */
export async function resolveEventLogoUrl(
  storage: { from(bucket: string): StorageBucketApi },
  row: EventLogoRefRow
): Promise<string | null> {
  const path = row.file_path?.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const bucket = bucketFromMetadata(row.file_metadata);
  const api = storage.from(bucket);

  if (row.is_public === true) {
    return api.getPublicUrl(path).data.publicUrl ?? null;
  }
  if (api.createSignedUrl) {
    const { data, error } = await api.createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
  return null;
}

/** Build event_id → resolved logo URL for dashboard events. */
export async function resolveDashboardEventLogoUrls(
  storage: { from(bucket: string): StorageBucketApi } | null,
  refs: EventLogoRefRow[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!storage) return out;

  const latest = pickLatestEventLogoByEventId(refs);
  for (const [eventId, row] of latest) {
    const url = await resolveEventLogoUrl(storage, row);
    if (url) out.set(eventId, url);
  }
  return out;
}
