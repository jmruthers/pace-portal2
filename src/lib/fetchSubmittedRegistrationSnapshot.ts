/**
 * PR17 — Load submitted registration answers for read-only journey state.
 */
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { CoreFormResponseValueRow } from '@/lib/eventDraftPersistence';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
export type SubmittedRegistrationSnapshot = {
  applicationId: string;
  responseId: string;
  valueByFieldId: Record<string, unknown>;
};

const DRAFT_STATUS = 'draft';

function normStatus(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  return t === '' ? null : t;
}

function valueMapFromRows(rows: CoreFormResponseValueRow[]): Record<string, unknown> {
  const valueByFieldId: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.form_field_id;
    if (row.value_json != null) {
      valueByFieldId[key] = row.value_json;
    } else if (row.value_text != null) {
      valueByFieldId[key] = row.value_text;
    }
  }
  return valueByFieldId;
}

async function loadValueMapByResponseId(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  responseId: string
): Promise<ApiResult<Record<string, unknown>>> {
  const valsRes = await client
    .from('core_form_response_values')
    .select('*')
    .eq('response_id', responseId);

  if (valsRes.error) {
    return err({
      code: 'RESPONSE_VALUES_QUERY',
      message: valsRes.error.message ?? 'Could not load answers.',
    });
  }

  return ok(valueMapFromRows((valsRes.data ?? []) as CoreFormResponseValueRow[]));
}

async function findSubmittedResponseId(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  formId: string,
  applicationId: string
): Promise<ApiResult<string | null>> {
  const primaryRes = await client
    .from('core_form_responses')
    .select('id')
    .eq('form_id', formId)
    .eq('workflow_subject_type', 'base_application')
    .eq('workflow_subject_id', applicationId)
    .eq('status', 'submitted')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (primaryRes.error) {
    return err({
      code: 'RESPONSE_QUERY',
      message: primaryRes.error.message ?? 'Could not load submitted response.',
    });
  }

  const primaryId = (primaryRes.data as { id: string } | null)?.id;
  if (primaryId) {
    return ok(primaryId);
  }

  const fallbackRes = await client
    .from('core_form_responses')
    .select('id')
    .eq('form_id', formId)
    .eq('workflow_subject_id', applicationId)
    .eq('status', 'submitted')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (fallbackRes.error) {
    return err({
      code: 'RESPONSE_QUERY',
      message: fallbackRes.error.message ?? 'Could not load submitted response.',
    });
  }

  return ok((fallbackRes.data as { id: string } | null)?.id ?? null);
}

/**
 * When the member has a non-draft `base_application` for the event, returns submitted response values
 * for the given form. Otherwise returns `null` (draft or no application).
 */
export async function fetchSubmittedRegistrationSnapshot(
  secure: RBACSupabaseClient | null,
  personId: string,
  eventId: string,
  formId: string
): Promise<ApiResult<SubmittedRegistrationSnapshot | null>> {
  const client = toTypedSupabase(secure);
  if (!client) {
    return err({ code: 'FORM_LOAD_CONTEXT', message: 'Client required.' });
  }

  const appRes = await client
    .from('base_application')
    .select('id, status')
    .eq('person_id', personId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (appRes.error) {
    return err({
      code: 'APPLICATION_QUERY',
      message: appRes.error.message ?? 'Could not load application.',
    });
  }

  const appRow = appRes.data as { id: string; status: string | null } | null;
  if (!appRow?.id) {
    return ok(null);
  }

  const st = normStatus(appRow.status);
  if (st == null || st === DRAFT_STATUS) {
    return ok(null);
  }

  const responseIdRes = await findSubmittedResponseId(client, formId, appRow.id);
  if (!isOk(responseIdRes)) {
    return responseIdRes as ApiResult<never>;
  }

  const responseId = responseIdRes.data;
  if (responseId) {
    const valuesRes = await loadValueMapByResponseId(client, responseId);
    if (!isOk(valuesRes)) {
      return valuesRes as ApiResult<never>;
    }
    return ok({
      applicationId: appRow.id,
      responseId,
      valueByFieldId: valuesRes.data,
    });
  }

  return ok({
    applicationId: appRow.id,
    responseId: appRow.id,
    valueByFieldId: {},
  });
}
