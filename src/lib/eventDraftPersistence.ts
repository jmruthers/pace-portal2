import {
  createEventId,
  createOrganisationId,
  err,
  isOk,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

const WORKFLOW_SUBJECT_TYPE = 'base_application';
const DRAFT_STATUS = 'draft';

export type CoreFormResponseValueRow =
  Database['public']['Tables']['core_form_response_values']['Row'];

export type DraftApplicationBundle = {
  /** Set when a legacy draft `base_application` row exists; `null` until final submit in the PR16 path. */
  applicationId: string | null;
  responseId: string;
  valueByFieldId: Record<string, unknown>;
};

export async function ensureDraftBundle(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  personId: string,
  organisationId: string,
  eventId: string,
  formId: string
): Promise<ApiResult<DraftApplicationBundle>> {
  const eventIdTyped = createEventId(eventId);
  const orgIdTyped = createOrganisationId(organisationId);

  const existingApp = await client
    .from('base_application')
    .select('id, status, form_id')
    .eq('person_id', personId)
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
        code: 'APPLICATION_NOT_DRAFT',
        message: 'An application for this event already exists and is not a draft.',
      });
    }
  }

  const existingResp =
    applicationId != null
      ? await client
          .from('core_form_responses')
          .select('id')
          .eq('form_id', formId)
          .eq('workflow_subject_type', WORKFLOW_SUBJECT_TYPE)
          .eq('workflow_subject_id', applicationId)
          .maybeSingle()
      : await client
          .from('core_form_responses')
          .select('id')
          .eq('form_id', formId)
          .eq('respondent_id', personId)
          .eq('status', DRAFT_STATUS)
          .is('workflow_subject_id', null)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

  if (existingResp.error) {
    return err({
      code: 'DRAFT_RESPONSE_QUERY',
      message: existingResp.error.message ?? 'Could not load form response.',
    });
  }

  let responseId: string;
  if (existingResp.data?.id) {
    responseId = existingResp.data.id;
  } else {
    const rins = await client
      .from('core_form_responses')
      .insert({
        form_id: formId,
        organisation_id: orgIdTyped,
        respondent_id: personId,
        status: DRAFT_STATUS,
        workflow_subject_type: applicationId != null ? WORKFLOW_SUBJECT_TYPE : null,
        workflow_subject_id: applicationId,
      })
      .select('id')
      .single();

    if (rins.error || !rins.data?.id) {
      return err({
        code: 'DRAFT_RESPONSE_CREATE',
        message: rins.error?.message ?? 'Could not create draft response.',
      });
    }
    responseId = rins.data.id;
  }

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

  return ok({ applicationId, responseId, valueByFieldId });
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
