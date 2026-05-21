/**
 * PR16 — Final event registration form submit: persists response values, creates `base_application`
 * via `app_base_application_create`, then links `core_form_responses.workflow_subject_*`.
 */
import {
  err,
  isOk,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import {
  createEventId,
  createOrganisationId,
} from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  ensureDraftBundle,
  persistDraftValues,
} from '@/lib/eventDraftPersistence';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

const WORKFLOW_SUBJECT_TYPE = 'base_application';

export type EventSubmissionErrorCode =
  | 'MISSING_ORG_CONTEXT'
  | 'PROXY_RESOLUTION_FAILED'
  | 'VALIDATION_FAILED'
  | 'APPLICATION_RPC_FAILED'
  | 'RESPONSE_PERSISTENCE_FAILED'
  | 'PARTIAL_PERSISTENCE'
  | 'DUPLICATE_SUBMIT_PREVENTED';

export type SubmitEventApplicationInput = {
  client: NonNullable<ReturnType<typeof toTypedSupabase>>;
  actingUserId: string;
  applicantPersonId: string;
  organisationId: string;
  eventId: string;
  formId: string;
  fieldRows: CoreFormFieldRow[];
  /** Full react-hook-form values including `confirmations` */
  formValues: Record<string, unknown>;
};

export type SubmitEventApplicationResult = {
  applicationId: string;
  responseId: string;
};

export async function fetchRegistrationTypeIdForForm(
  client: NonNullable<ReturnType<typeof toTypedSupabase>>,
  formId: string
): Promise<ApiResult<string>> {
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
      code: 'VALIDATION_FAILED',
      message: bindingRes.error.message ?? 'Could not resolve registration type.',
    });
  }
  const regType = bindingRes.data as { registration_type_id: string } | null;
  if (!regType?.registration_type_id) {
    return err({
      code: 'VALIDATION_FAILED',
      message: 'This form has no registration type binding.',
    });
  }
  return ok(regType.registration_type_id);
}

function stripConfirmations(formValues: Record<string, unknown>): Record<string, unknown> {
  const { confirmations: _c, ...rest } = formValues;
  void _c;
  return rest;
}

function mapRpcFailure(message: string): EventSubmissionErrorCode {
  const m = message.toLowerCase();
  if (
    m.includes('duplicate') ||
    m.includes('unique') ||
    m.includes('23505') ||
    m.includes('already exists')
  ) {
    return 'DUPLICATE_SUBMIT_PREVENTED';
  }
  if (
    m.includes('validation_error.') ||
    m.includes('scope_denied.') ||
    m.includes('eligibility_denied.') ||
    m.includes('authorization_error.')
  ) {
    return 'VALIDATION_FAILED';
  }
  return 'APPLICATION_RPC_FAILED';
}

/**
 * Persists field values, calls `app_base_application_create`, then links the form response.
 */
export async function submitEventApplication(
  input: SubmitEventApplicationInput
): Promise<ApiResult<SubmitEventApplicationResult>> {
  const {
    client,
    actingUserId,
    applicantPersonId,
    organisationId,
    eventId,
    formId,
    fieldRows,
    formValues,
  } = input;

  if (!organisationId?.trim()) {
    return err({
      code: 'MISSING_ORG_CONTEXT',
      message: 'Select an organisation before submitting.',
    });
  }
  if (!actingUserId?.trim() || !applicantPersonId?.trim()) {
    return err({
      code: 'PROXY_RESOLUTION_FAILED',
      message: 'Sign-in context is required to submit this form.',
    });
  }

  const eventIdTyped = createEventId(eventId);

  const existingApp = await client
    .from('base_application')
    .select('id, status')
    .eq('person_id', applicantPersonId)
    .eq('event_id', eventIdTyped)
    .maybeSingle();

  if (existingApp.error) {
    return err({
      code: 'VALIDATION_FAILED',
      message: existingApp.error.message ?? 'Could not verify application state.',
    });
  }

  if (existingApp.data?.id) {
    const st = (existingApp.data as { status?: string | null }).status?.trim().toLowerCase();
    if (st && st !== 'draft') {
      return err({
        code: 'DUPLICATE_SUBMIT_PREVENTED',
        message: 'You already have an application for this event.',
      });
    }
    if (st === 'draft') {
      return err({
        code: 'APPLICATION_RPC_FAILED',
        message:
          'This form is linked to an older draft that cannot be submitted automatically. Please contact support for assistance.',
      });
    }
  }

  const bundleRes = await ensureDraftBundle(
    client,
    actingUserId,
    applicantPersonId,
    organisationId,
    eventId,
    formId
  );
  if (!isOk(bundleRes)) {
    if (bundleRes.error.code === 'APPLICATION_NOT_DRAFT') {
      return err({
        code: 'DUPLICATE_SUBMIT_PREVENTED',
        message: bundleRes.error.message ?? 'This application was already submitted.',
      });
    }
    return err({
      code: 'VALIDATION_FAILED',
      message: bundleRes.error.message ?? 'Could not prepare this form for submission.',
    });
  }
  const { responseId } = bundleRes.data;

  const dynamic = stripConfirmations(formValues);

  const persistRes1 = await persistDraftValues(
    client,
    organisationId,
    responseId,
    fieldRows,
    dynamic
  );
  if (!isOk(persistRes1)) {
    return err({
      code: 'RESPONSE_PERSISTENCE_FAILED',
      message: persistRes1.error.message ?? 'Could not save form answers.',
    });
  }

  const regTypeRes = await fetchRegistrationTypeIdForForm(client, formId);
  if (!isOk(regTypeRes)) {
    return regTypeRes as ApiResult<never>;
  }
  const registrationTypeId = regTypeRes.data;

  const rpcRes = await client.rpc('app_base_application_create', {
    p_event_id: eventId,
    p_person_id: applicantPersonId,
    p_registration_type_id: registrationTypeId,
    p_organisation_id: organisationId,
    p_form_id: formId,
    p_form_response_id: responseId,
    p_user_id: actingUserId,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message ?? 'Application could not be created.';
    return err({
      code: mapRpcFailure(msg),
      message: msg,
    });
  }
  if (rpcRes.data == null || rpcRes.data === '') {
    return err({
      code: 'APPLICATION_RPC_FAILED',
      message: 'Application could not be created.',
    });
  }

  const applicationId = String(rpcRes.data);
  const now = new Date().toISOString();
  const orgIdTyped = createOrganisationId(organisationId);

  const up = await client
    .from('core_form_responses')
    .update({
      workflow_subject_type: WORKFLOW_SUBJECT_TYPE,
      workflow_subject_id: applicationId,
      status: 'submitted',
      submitted_at: now,
      organisation_id: orgIdTyped,
      updated_at: now,
    })
    .eq('id', responseId);

  if (up.error) {
    /** Orphan UX note: `app_base_application_create` already persisted `base_application`; client cannot roll back RPC. User retries via support if needed. */
    return err({
      code: 'PARTIAL_PERSISTENCE',
      message:
        'Your application was created but the form response could not be finalised. Please retry or contact support.',
    });
  }

  return ok({ applicationId, responseId });
}
