import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';

type TypedClient = NonNullable<ReturnType<typeof toTypedSupabase>>;

/**
 * Loads `base_application.status` for the given person and event ids (dashboard + delegated workspace).
 */
export async function fetchApplicationStatusByEventIds(
  client: TypedClient,
  personId: string,
  eventIds: readonly string[],
  errorResult: { code: string; fallbackMessage: string }
): Promise<ApiResult<Record<string, string>>> {
  if (eventIds.length === 0) {
    return ok({});
  }

  const appRes = await client
    .from('base_application')
    .select('event_id, status')
    .eq('person_id', personId)
    .in('event_id', [...eventIds]);

  if (appRes.error) {
    return err({
      code: errorResult.code,
      message: appRes.error.message || errorResult.fallbackMessage,
    });
  }

  const applicationStatusByEventId: Record<string, string> = {};
  for (const row of (appRes.data ?? []) as Array<{ event_id: string; status: string }>) {
    applicationStatusByEventId[row.event_id] = row.status;
  }
  return ok(applicationStatusByEventId);
}
