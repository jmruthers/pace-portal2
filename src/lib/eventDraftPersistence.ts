import {
  createEventId,
  createOrganisationId,
  err,
  isOk,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { PARTICIPANT_ALREADY_SUBMITTED_MESSAGE } from '@/lib/participantAlreadySubmittedMessage';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

const DRAFT_STATUS = 'draft';

export type CoreFormResponseValueRow =
  Database['public']['Tables']['core_form_response_values']['Row'];

export type DraftApplicationBundle = {
  /** Set when a legacy draft `base_application` row exists; `null` until final submit in the PR16 path. */
  applicationId: string | null;
  responseId: string;
  /** Event host org from `app_portal_form_response_ensure_draft` — use for value writes and submit. */
  writeOrganisationId: string;
  valueByFieldId: Record<string, unknown>;
};

type EnsureDraftRpcRow = {
  response_id: string;
  organisation_id: string;
  created?: boolean;
  status?: 'draft' | 'submitted';
  application_id?: string | null;
};

function normEnsureDraftStatus(raw: unknown): 'draft' | 'submitted' | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const status = raw.trim().toLowerCase();
  if (status === 'draft' || status === 'submitted') {
    return status;
  }
  return null;
}

function parseEnsureDraftRpcData(data: unknown): EnsureDraftRpcRow | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }
  const row = data as Record<string, unknown>;
  const responseId = row.response_id;
  const organisationId = row.organisation_id;
  if (typeof responseId !== 'string' || responseId.trim() === '') {
    return null;
  }
  if (typeof organisationId !== 'string' || organisationId.trim() === '') {
    return null;
  }
  const status = normEnsureDraftStatus(row.status) ?? 'draft';
  const applicationIdRaw = row.application_id;
  const applicationId =
    typeof applicationIdRaw === 'string' && applicationIdRaw.trim() !== ''
      ? applicationIdRaw
      : null;
  return {
    response_id: responseId,
    organisation_id: organisationId,
    created: typeof row.created === 'boolean' ? row.created : undefined,
    status,
    application_id: applicationId,
  };
}

/**
 * Ensures a draft `core_form_responses` row via `app_portal_form_response_ensure_draft`.
 * `applicantPersonId` scopes duplicate `base_application` checks and PORTAL-DB-005 draft ensure RPC.
 */
export async function ensureDraftBundle(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  applicantPersonId: string,
  eventId: string,
  formId: string
): Promise<ApiResult<DraftApplicationBundle>> {
  const eventIdTyped = createEventId(eventId);

  const existingApp = await client
    .from('base_application')
    .select('id, status, form_id')
    .eq('person_id', applicantPersonId)
    .eq('event_id', eventIdTyped)
    .maybeSingle();

  if (existingApp.error) {
    return err({
      code: 'DRAFT_APP_QUERY',
      message: existingApp.error.message ?? 'Could not load application.',
    });
  }

  let applicationId: string | null = null;

  if (existingApp.data?.id) {
    applicationId = existingApp.data.id;
    const st = (existingApp.data as { status?: string | null }).status?.trim().toLowerCase();
    if (st != null && st !== '' && st !== DRAFT_STATUS) {
      return err({
        code: 'APPLICATION_ALREADY_SUBMITTED',
        message: PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
      });
    }
  }

  type EnsureDraftRpc = (
    fn: 'app_portal_form_response_ensure_draft',
    args: { p_form_id: string; p_event_id: string; p_applicant_person_id: string }
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  const ensureRes = await (client.rpc as unknown as EnsureDraftRpc)('app_portal_form_response_ensure_draft', {
    p_form_id: formId,
    p_event_id: eventId,
    p_applicant_person_id: applicantPersonId,
  });

  if (ensureRes.error) {
    return err({
      code: 'DRAFT_RESPONSE_ENSURE',
      message: ensureRes.error.message ?? 'Could not prepare this form for saving.',
    });
  }

  const ensured = parseEnsureDraftRpcData(ensureRes.data);
  if (!ensured) {
    return err({
      code: 'DRAFT_RESPONSE_ENSURE',
      message: 'Could not prepare this form for saving.',
    });
  }

  if (ensured.status === 'submitted') {
    return err({
      code: 'APPLICATION_ALREADY_SUBMITTED',
      message: PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
    });
  }

  const responseId = ensured.response_id;
  const writeOrganisationId = ensured.organisation_id;

  const valsRes = await client
    .from('core_form_response_values')
    .select('*')
    .eq('response_id', responseId);

  if (valsRes.error) {
    return err({
      code: 'DRAFT_VALUES_QUERY',
      message: valsRes.error.message ?? 'Could not load saved answers.',
    });
  }

  const valueByFieldId: Record<string, unknown> = {};
  for (const row of (valsRes.data ?? []) as CoreFormResponseValueRow[]) {
    const key = row.form_field_id;
    if (row.value_json != null) {
      valueByFieldId[key] = row.value_json;
    } else if (row.value_text != null) {
      valueByFieldId[key] = row.value_text;
    }
  }

  return ok({ applicationId, responseId, writeOrganisationId, valueByFieldId });
}

async function deleteDraftValueRow(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  responseId: string,
  formFieldId: string
): Promise<ApiResult<void>> {
  const del = await client
    .from('core_form_response_values')
    .delete()
    .eq('response_id', responseId)
    .eq('form_field_id', formFieldId);

  if (del.error) {
    return err({ code: 'DRAFT_VALUE_DELETE', message: del.error.message ?? 'Draft save failed.' });
  }
  return ok(undefined);
}

export async function persistDraftValues(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  organisationId: string,
  responseId: string,
  fieldRows: CoreFormFieldRow[],
  dynamicValues: Record<string, unknown>
): Promise<ApiResult<void>> {
  const orgIdTyped = createOrganisationId(organisationId);
  const allowedFieldIds = new Set(fieldRows.map((r) => r.id));

  const existingRes = await client
    .from('core_form_response_values')
    .select('form_field_id')
    .eq('response_id', responseId);

  if (existingRes.error) {
    return err({
      code: 'DRAFT_VALUE_QUERY',
      message: existingRes.error.message ?? 'Could not read draft values.',
    });
  }

  const existingIds = new Set(
    ((existingRes.data ?? []) as { form_field_id: string }[])
      .map((r) => r.form_field_id)
      .filter(Boolean)
  );

  for (const fid of [...existingIds]) {
    if (!allowedFieldIds.has(fid)) {
      const d = await deleteDraftValueRow(client, responseId, fid);
      if (!isOk(d)) return d;
    }
  }

  for (const row of fieldRows) {
    const hasKey = Object.prototype.hasOwnProperty.call(dynamicValues, row.id);
    const v = dynamicValues[row.id];
    const shouldPersist = hasKey && v !== undefined;

    if (!shouldPersist) {
      if (existingIds.has(row.id)) {
        const d = await deleteDraftValueRow(client, responseId, row.id);
        if (!isOk(d)) return d;
      }
      continue;
    }

    const valueJson: Database['public']['Tables']['core_form_response_values']['Insert']['value_json'] =
      typeof v === 'object' && v !== null ? (v as never) : null;
    const valueText =
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : null;

    const payload: Database['public']['Tables']['core_form_response_values']['Insert'] = {
      response_id: responseId,
      organisation_id: orgIdTyped,
      form_field_id: row.id,
      field_key: row.field_key,
      value_json: valueJson,
      value_text: valueText,
    };

    const del = await client
      .from('core_form_response_values')
      .delete()
      .eq('response_id', responseId)
      .eq('form_field_id', row.id);

    if (del.error) {
      return err({ code: 'DRAFT_VALUE_DELETE', message: del.error.message ?? 'Draft save failed.' });
    }

    const ins = await client.from('core_form_response_values').insert(payload);
    if (ins.error) {
      return err({ code: 'DRAFT_VALUE_INSERT', message: ins.error.message ?? 'Draft save failed.' });
    }
  }

  return ok(undefined);
}
