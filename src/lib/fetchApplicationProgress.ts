/**
 * BA05b — Participant application progress via `data_base_application_progress_get`.
 */
import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import {
  isApplicationProgressAccessDenied,
  parseApplicationProgressPayload,
  type ApplicationProgressPayload,
} from '@/lib/applicationProgressContracts';

export type FetchApplicationProgressErrorCode =
  | 'APPLICATION_PROGRESS_ACCESS_DENIED'
  | 'APPLICATION_PROGRESS_SHAPE'
  | 'APPLICATION_PROGRESS_RPC';

export async function fetchApplicationProgress(
  client: SupabaseClient<Database>,
  applicationId: string
): Promise<ApiResult<ApplicationProgressPayload>> {
  const trimmed = applicationId.trim();
  if (!trimmed) {
    return err({ code: 'APPLICATION_PROGRESS_SHAPE', message: 'Application id is required.' });
  }

  const { data, error } = await client.rpc('data_base_application_progress_get', {
    p_application_id: trimmed,
  });

  if (error) {
    const msg = error.message?.trim() ?? '';
    if (isApplicationProgressAccessDenied(msg)) {
      return err({
        code: 'APPLICATION_PROGRESS_ACCESS_DENIED',
        message: 'You cannot view this application.',
      });
    }
    return err({
      code: 'APPLICATION_PROGRESS_RPC',
      message: msg.length > 0 ? msg : 'Could not load application progress.',
    });
  }

  const parsed = parseApplicationProgressPayload(data);
  if (!parsed.ok) {
    return err({
      code: 'APPLICATION_PROGRESS_SHAPE',
      message: 'Application progress response was not in the expected format.',
    });
  }

  return ok(parsed.data);
}
