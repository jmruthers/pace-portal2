import { FileDisplay } from '@solvera/pace-core/components';
import { useFileDisplay } from '@solvera/pace-core/hooks';
import type { FileReference } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toSupabaseClientLike } from '@/lib/supabase-typed';

export type EventLogoProps = {
  eventName: string;
  logoRef: FileReference | null;
  /** Combined busy state (app id resolving, batch ref fetch, etc.) */
  refsBusy: boolean;
  /** True when batch file-reference load failed (distinct from missing logo). */
  refsFailed?: boolean;
};

function initialsFromEventName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Event card logo via authenticated pace-core helpers (PR14); initials fallback matches dashboard pattern.
 */
export function EventLogo({ eventName, logoRef, refsBusy, refsFailed = false }: EventLogoProps) {
  const secure = useSecureSupabase();
  const storageClient = toSupabaseClientLike(secure);
  const { url, isLoading } = useFileDisplay(logoRef, { client: storageClient });
  const busy = refsBusy || (Boolean(logoRef) && isLoading);
  const showInitialsFallback = !busy && (!url || !logoRef);
  const showRefsFailureChrome = refsFailed && showInitialsFallback;

  return (
    <span
      className={`grid min-h-[11rem] max-h-[11rem] w-full place-items-center overflow-hidden rounded-md border border-sec-200 bg-sec-100${showRefsFailureChrome ? ' ring-1 ring-acc-400' : ''}`}
    >
      {showRefsFailureChrome ? (
        <output className="sr-only" aria-live="polite">
          Event logo could not be loaded.
        </output>
      ) : null}
      {busy ? <span aria-busy="true">…</span> : null}
      {!busy && url && logoRef ? (
        <FileDisplay
          fileReference={logoRef}
          url={url}
          variant="inline"
          className="h-[11rem] w-full max-w-full object-contain"
          label={`${eventName} logo`}
        />
      ) : null}
      {showInitialsFallback ? <span aria-hidden="true">{initialsFromEventName(eventName)}</span> : null}
    </span>
  );
}
