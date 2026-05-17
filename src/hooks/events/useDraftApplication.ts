import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import { createEventId, createOrganisationId } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

const WORKFLOW_SUBJECT_TYPE = 'base_application';
const DRAFT_STATUS = 'draft';

export type CoreFormResponseValueRow = Database['public']['Tables']['core_form_response_values']['Row'];

export type DraftApplicationBundle = {
  applicationId: string;
  responseId: string;
  valueByFieldId: Record<string, unknown>;
};

/* eslint-disable complexity -- Draft bootstrap: load/reuse application, response row, and value snapshot in one transaction. */
/** Exported for unit tests (PR15). */
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

  let applicationId: string;

  if (existingApp.data?.id) {
    applicationId = existingApp.data.id;
    const st = (existingApp.data as { status?: string | null }).status?.trim().toLowerCase();
    if (st != null && st !== '' && st !== DRAFT_STATUS) {
      return err({
        code: 'APPLICATION_NOT_DRAFT',
        message: 'An application for this event already exists and is not a draft.',
      });
    }
  } else {
    const bindingRes = await client
      .from('base_form_registration_type')
      .select('registration_type_id')
      .eq('form_id', formId)
      .order('is_default', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (bindingRes.error) {
      return err({
        code: 'DRAFT_BINDING_QUERY',
        message: bindingRes.error.message ?? 'Could not resolve registration type.',
      });
    }
    const regType = bindingRes.data as { registration_type_id: string } | null;
    if (!regType?.registration_type_id) {
      return err({
        code: 'DRAFT_BINDING_MISSING',
        message: 'This form has no registration type binding; draft cannot be created yet.',
      });
    }

    const ins = await client
      .from('base_application')
      .insert({
        person_id: personId,
        event_id: eventIdTyped,
        organisation_id: orgIdTyped,
        registration_type_id: regType.registration_type_id,
        form_id: formId,
        status: DRAFT_STATUS,
      })
      .select('id')
      .single();

    if (ins.error || !ins.data?.id) {
      return err({
        code: 'DRAFT_APP_CREATE',
        message: ins.error?.message ?? 'Could not create draft application.',
      });
    }
    applicationId = ins.data.id;
  }

  const existingResp = await client
    .from('core_form_responses')
    .select('id')
    .eq('form_id', formId)
    .eq('workflow_subject_type', WORKFLOW_SUBJECT_TYPE)
    .eq('workflow_subject_id', applicationId)
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
        workflow_subject_type: WORKFLOW_SUBJECT_TYPE,
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
/* eslint-enable complexity */

/** Exported for unit tests (PR15). */
export async function persistDraftValues(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  organisationId: string,
  responseId: string,
  fieldRows: CoreFormFieldRow[],
  dynamicValues: Record<string, unknown>
): Promise<ApiResult<void>> {
  const orgIdTyped = createOrganisationId(organisationId);

  for (const row of fieldRows) {
    const v = dynamicValues[row.id];
    if (v === undefined) continue;

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

export function useDraftApplication(
  personId: string | null,
  organisationId: string | null,
  eventId: string | null,
  formId: string | null,
  fieldRows: CoreFormFieldRow[]
) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const [debounceMs] = useState(600);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bundleRef = useRef<DraftApplicationBundle | null>(null);

  const stableFieldIds = fieldRows.map((r) => r.id).join(',');

  const bundleQuery = useQuery({
    queryKey: ['draftApplication', 'v1', personId, organisationId, eventId, formId, stableFieldIds],
    enabled: Boolean(client && personId && organisationId && eventId && formId),
    staleTime: 10_000,
    queryFn: async (): Promise<ApiResult<DraftApplicationBundle>> => {
      if (!client || !personId || !organisationId || !eventId || !formId) {
        return err({ code: 'DRAFT_CONTEXT', message: 'Draft requires full context.' });
      }
      return ensureDraftBundle(client, personId, organisationId, eventId, formId);
    },
  });

  const bundle = bundleQuery.data && isOk(bundleQuery.data) ? bundleQuery.data.data : null;

  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const saveMutation = useMutation({
    mutationFn: async (dynamicValues: Record<string, unknown>) => {
      const rid = bundleRef.current?.responseId;
      if (!client || !organisationId || !rid) {
        throw new Error('Cannot save draft.');
      }
      const r = await persistDraftValues(client, organisationId, rid, fieldRows, dynamicValues);
      if (!isOk(r)) {
        throw new Error(r.error.message);
      }
    },
  });

  const scheduleSaveDraft = useCallback(
    (dynamicValues: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveMutation.mutate(dynamicValues);
      }, debounceMs);
    },
    [debounceMs, saveMutation]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const hydrateError =
    bundleQuery.data != null && !isOk(bundleQuery.data) ? bundleQuery.data.error.message : null;

  const saveDraftError =
    saveMutation.isError && saveMutation.error instanceof Error
      ? saveMutation.error.message
      : saveMutation.isError
        ? 'Draft save failed.'
        : null;

  return {
    applicationId: bundle?.applicationId ?? null,
    responseId: bundle?.responseId ?? null,
    valueByFieldId: bundle?.valueByFieldId ?? {},
    isHydrating: bundleQuery.isLoading || bundleQuery.isFetching,
    hydrateError,
    saveDraftNow: (dynamicValues: Record<string, unknown>) => saveMutation.mutate(dynamicValues),
    scheduleSaveDraft,
    isSavingDraft: saveMutation.isPending,
    saveDraftError,
    refetchBundle: bundleQuery.refetch,
  };
}
