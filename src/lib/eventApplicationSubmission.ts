/**
 * PR16 — Final event registration form submit: persists response values, creates `base_application`
 * via `app_base_application_create` (which finalises the linked form response).
 */
import {
  err,
  isOk,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { createEventId } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  ensureDraftBundle,
  persistDraftValues,
  type DraftApplicationBundle,
} from '@/lib/eventDraftPersistence';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { fetchRegistrationTypeIdForApplicant } from '@/lib/resolveRegistrationTypeForApplicant';
import { mapSubmissionRpcMessage } from '@/lib/submissionRpcMessages';
import { runRpcWithOrganisationContext } from '@/lib/submissionOrganisationContext';
import {
  isAlreadySubmittedParticipantMessage,
  PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
} from '@/lib/participantAlreadySubmittedMessage';

const DRAFT_STATUS = 'draft';

type TypedClient = NonNullable<ReturnType<typeof toTypedSupabase>>;

function normResponseStatus(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') {
    return null;
  }
  const status = raw.trim().toLowerCase();
  return status === '' ? null : status;
}

export type EventSubmissionErrorCode =
  | 'MISSING_ORG_CONTEXT'
  | 'PROXY_RESOLUTION_FAILED'
  | 'VALIDATION_FAILED'
  | 'APPLICATION_RPC_FAILED'
  | 'RESPONSE_PERSISTENCE_FAILED'
  | 'PARTIAL_PERSISTENCE'
  | 'DUPLICATE_SUBMIT_PREVENTED';

export type SubmitEventApplicationInput = {
  client: TypedClient;
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
  client: TypedClient,
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
    m.includes('already exists') ||
    m.includes('already submitted')
  ) {
    return 'DUPLICATE_SUBMIT_PREVENTED';
  }
  if (m.includes('base_application_duplicate')) {
    return 'DUPLICATE_SUBMIT_PREVENTED';
  }
  if (
    m.includes('validation_error.') ||
    m.includes('scope_denied.') ||
    m.includes('eligibility_denied.') ||
    m.includes('authorization_error.') ||
    m.includes('base_application_')
  ) {
    return 'VALIDATION_FAILED';
  }
  return 'APPLICATION_RPC_FAILED';
}

function validateSubmitInput(
  input: SubmitEventApplicationInput
): ApiResult<{ eventIdTyped: ReturnType<typeof createEventId> }> {
  const { organisationId, actingUserId, applicantPersonId, eventId } = input;

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

  return ok({ eventIdTyped: createEventId(eventId) });
}

async function guardExistingApplication(
  client: TypedClient,
  applicantPersonId: string,
  eventIdTyped: ReturnType<typeof createEventId>
): Promise<ApiResult<null>> {
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

  if (!existingApp.data?.id) {
    return ok(null);
  }

  const st = (existingApp.data as { status?: string | null }).status?.trim().toLowerCase();
  if (st && st !== DRAFT_STATUS) {
    return err({
      code: 'DUPLICATE_SUBMIT_PREVENTED',
      message: PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
    });
  }
  if (st === DRAFT_STATUS) {
    return err({
      code: 'APPLICATION_RPC_FAILED',
      message:
        'This form is linked to an older draft that cannot be submitted automatically. Please contact support for assistance.',
    });
  }

  return ok(null);
}

async function resolveSubmitDraftBundle(
  client: TypedClient,
  applicantPersonId: string,
  eventId: string,
  formId: string
): Promise<ApiResult<DraftApplicationBundle>> {
  const bundleRes = await ensureDraftBundle(client, applicantPersonId, eventId, formId);
  if (isOk(bundleRes)) {
    return bundleRes;
  }

  if (
    bundleRes.error.code === 'APPLICATION_NOT_DRAFT' ||
    bundleRes.error.code === 'APPLICATION_ALREADY_SUBMITTED' ||
    isAlreadySubmittedParticipantMessage(bundleRes.error.message)
  ) {
    return err({
      code: 'DUPLICATE_SUBMIT_PREVENTED',
      message: PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
    });
  }

  return err({
    code: 'VALIDATION_FAILED',
    message: bundleRes.error.message ?? 'Could not prepare this form for submission.',
  });
}

async function guardResponseNotSubmitted(
  client: TypedClient,
  responseId: string
): Promise<ApiResult<null>> {
  const responseStatusRes = await client
    .from('core_form_responses')
    .select('status')
    .eq('id', responseId)
    .maybeSingle();

  if (responseStatusRes.error) {
    return err({
      code: 'VALIDATION_FAILED',
      message: responseStatusRes.error.message ?? 'Could not verify form response state.',
    });
  }

  if (normResponseStatus((responseStatusRes.data as { status?: string | null } | null)?.status) === 'submitted') {
    return err({
      code: 'DUPLICATE_SUBMIT_PREVENTED',
      message: PARTICIPANT_ALREADY_SUBMITTED_MESSAGE,
    });
  }

  return ok(null);
}

async function runApplicationCreateRpc(args: {
  client: TypedClient;
  writeOrganisationId: string;
  eventId: string;
  applicantPersonId: string;
  registrationTypeId: string;
  formId: string;
  responseId: string;
  actingUserId: string;
}): Promise<ApiResult<string>> {
  const {
    client,
    writeOrganisationId,
    eventId,
    applicantPersonId,
    registrationTypeId,
    formId,
    responseId,
    actingUserId,
  } = args;

  const rpcRes = await runRpcWithOrganisationContext(
    client as unknown as RBACSupabaseClient,
    writeOrganisationId,
    eventId,
    'app_base_application_create',
    {
      p_event_id: eventId,
      p_person_id: applicantPersonId,
      p_registration_type_id: registrationTypeId,
      p_organisation_id: writeOrganisationId,
      p_form_id: formId,
      p_form_response_id: responseId,
      p_user_id: actingUserId,
    }
  );

  if (rpcRes.error) {
    const rawMessage = rpcRes.error.message ?? 'Application could not be created.';
    const msg = mapSubmissionRpcMessage(rawMessage);
    return err({
      code: mapRpcFailure(rawMessage),
      message: msg,
    });
  }
  if (rpcRes.data == null || rpcRes.data === '') {
    return err({
      code: 'APPLICATION_RPC_FAILED',
      message: 'Application could not be created.',
    });
  }

  return ok(String(rpcRes.data));
}

/**
 * Persists field values, then calls `app_base_application_create` with `p_form_response_id`.
 */
export async function submitEventApplication(
  input: SubmitEventApplicationInput
): Promise<ApiResult<SubmitEventApplicationResult>> {
  const validated = validateSubmitInput(input);
  if (!isOk(validated)) {
    return validated;
  }

  const {
    client,
    actingUserId,
    applicantPersonId,
    eventId,
    formId,
    fieldRows,
    formValues,
  } = input;
  const { eventIdTyped } = validated.data;

  const existingGuard = await guardExistingApplication(client, applicantPersonId, eventIdTyped);
  if (!isOk(existingGuard)) {
    return existingGuard;
  }

  const bundleRes = await resolveSubmitDraftBundle(client, applicantPersonId, eventId, formId);
  if (!isOk(bundleRes)) {
    return bundleRes;
  }

  const { responseId, writeOrganisationId } = bundleRes.data;

  const responseGuard = await guardResponseNotSubmitted(client, responseId);
  if (!isOk(responseGuard)) {
    return responseGuard;
  }

  const dynamic = stripConfirmations(formValues);

  const persistRes1 = await persistDraftValues(
    client,
    writeOrganisationId,
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

  const regTypeRes = await fetchRegistrationTypeIdForApplicant(
    client,
    formId,
    applicantPersonId,
    writeOrganisationId
  );
  if (!isOk(regTypeRes)) {
    return regTypeRes as ApiResult<never>;
  }

  const applicationRes = await runApplicationCreateRpc({
    client,
    writeOrganisationId,
    eventId,
    applicantPersonId,
    registrationTypeId: regTypeRes.data,
    formId,
    responseId,
    actingUserId,
  });
  if (!isOk(applicationRes)) {
    return applicationRes;
  }

  return ok({ applicationId: applicationRes.data, responseId });
}
