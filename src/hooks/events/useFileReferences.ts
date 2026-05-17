import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import type { EventId } from '@solvera/pace-core/types';
import type { FileReference } from '@solvera/pace-core/types';
import { createEventId } from '@solvera/pace-core/types';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';
import { useResolvedAppId } from '@/shared/hooks/useResolvedAppId';
import { toFileMetadata } from '@/lib/fileMetadata';
import {
  pickLatestEventLogoByEventId,
  type EventLogoRefRow,
} from '@/shared/lib/eventDashboardLogos';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type EventLogoScope = Pick<DashboardEvent, 'event_id' | 'organisation_id'>;

type LogoRefDbRow = EventLogoRefRow & { id: string };

function rowToLogoFileReference(row: LogoRefDbRow, organisationId: string | null, appId: string): FileReference {
  const path = row.file_path?.trim() ?? '';
  const file_metadata = toFileMetadata(row.file_metadata, {
    fileName: path !== '' ? path : 'logo',
    fileType: 'image/png',
  });
  const created_at = row.created_at ?? '';

  return {
    id: row.id,
    table_name: 'core_events',
    record_id: row.record_id,
    file_path: row.file_path,
    file_metadata,
    organisation_id: organisationId,
    app_id: appId,
    is_public: row.is_public === true,
    created_at,
    updated_at: created_at,
  };
}

/** PR14: latest event-logo pace-core {@link FileReference} per event row (dashboard/hub authenticated surfaces). */
export function useFileReferences(scopesIn: readonly EventLogoScope[]) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const appId = useResolvedAppId();

  const eventIdsSorted = useMemo(() => {
    const ids = scopesIn.map((s) => s.event_id).filter(Boolean);
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  }, [scopesIn]);

  const organisationIdByEventId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of scopesIn) {
      m.set(s.event_id, s.organisation_id);
    }
    return m;
  }, [scopesIn]);

  const enabledQuery = Boolean(
    client &&
      user?.id &&
      appId.trim() !== '' &&
      eventIdsSorted.length > 0
  );

  const query = useQuery({
    queryKey: [
      'eventLogoFileRefs',
      'v1',
      user?.id ?? '',
      org?.selectedOrganisation?.id ?? '',
      appId,
      eventIdsSorted.join(','),
    ],
    enabled: enabledQuery,
    staleTime: 60_000,
    queryFn: async (): Promise<LogoRefDbRow[]> => {
      if (!client || eventIdsSorted.length === 0) {
        return [];
      }
      const refsRes = await client
        .from('core_file_references')
        .select('id, record_id, file_path, is_public, file_metadata, created_at')
        .eq('table_name', 'core_events')
        .in('record_id', eventIdsSorted);

      if (refsRes.error) {
        const msg =
          typeof refsRes.error.message === 'string' && refsRes.error.message.trim() !== ''
            ? refsRes.error.message
            : 'Could not load event file references.';
        throw new Error(msg);
      }

      const rows = (refsRes.data ?? []) as Array<{
        id: string;
        record_id: string | null;
        file_path: string | null;
        is_public: boolean | null;
        file_metadata: unknown;
        created_at: string | null;
      }>;

      return rows
        .filter((r) => r.record_id != null && String(r.record_id).trim() !== '')
        .map(
          (r) =>
            ({
              id: String(r.id ?? ''),
              record_id: String(r.record_id),
              file_path: String(r.file_path ?? ''),
              is_public: r.is_public,
              file_metadata: r.file_metadata,
              created_at: r.created_at,
            }) satisfies LogoRefDbRow
        );
    },
  });

  const refByEventId = useMemo((): Map<EventId, FileReference | null> => {
    const out = new Map<EventId, FileReference | null>();

    const markNulls = () => {
      for (const id of eventIdsSorted) {
        out.set(createEventId(id), null);
      }
    };

    markNulls();
    if (!(appId.trim() !== '') || query.data == null || query.data.length === 0) {
      return out;
    }

    const latest = pickLatestEventLogoByEventId(query.data);
    for (const id of eventIdsSorted) {
      const rowUnknown = latest.get(id) as LogoRefDbRow | undefined;
      const orgRow = organisationIdByEventId.get(id) ?? null;
      const hasId =
        rowUnknown?.id !== undefined &&
        typeof rowUnknown.id === 'string' &&
        rowUnknown.id.trim() !== '';
      const fr =
        rowUnknown != null && hasId
          ? rowToLogoFileReference(rowUnknown, orgRow, appId)
          : null;
      out.set(createEventId(id), fr);
    }
    return out;
  }, [appId, organisationIdByEventId, query.data, eventIdsSorted]);

  /** True while awaiting app resolution or fetching references */
  const isLoading =
    eventIdsSorted.length > 0 &&
    Boolean(
      !user?.id ||
        appId.trim() === '' ||
        (enabledQuery && (query.isLoading || query.isFetching))
    );

  return {
    refByEventId,
    /** When true, callers should prefer logo fallback UX */
    isLoading,
    isError: query.isError,
    error: query.error,
  };
}
