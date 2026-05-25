import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';

type TypedClient = NonNullable<ReturnType<typeof toTypedSupabase>>;

const DRAFT_STATUS = 'draft';
const SUBMITTED_STATUS = 'submitted';
const REGISTRATION_WORKFLOW = 'base_registration';

type RegistrationFormsLookup = {
  formIdToEventId: Map<string, string>;
};

async function fetchRegistrationFormsByEventIds(
  client: TypedClient,
  eventIds: readonly string[],
  errorResult: { code: string; fallbackMessage: string }
): Promise<ApiResult<RegistrationFormsLookup>> {
  const formsRes = await client
    .from('core_forms')
    .select('id, event_id')
    .in('event_id', [...eventIds])
    .eq('workflow_type', REGISTRATION_WORKFLOW)
    .eq('status', 'published');

  if (formsRes.error) {
    return err({
      code: errorResult.code,
      message: formsRes.error.message || errorResult.fallbackMessage,
    });
  }

  const formIdToEventId = new Map<string, string>();
  for (const row of (formsRes.data ?? []) as Array<{ id: string; event_id: string | null }>) {
    if (row.event_id) {
      formIdToEventId.set(row.id, row.event_id);
    }
  }

  return ok({ formIdToEventId });
}

async function fetchFormResponseStatusByEventIds(
  client: TypedClient,
  actingUserId: string,
  formIdToEventId: Map<string, string>,
  errorResult: { code: string; fallbackMessage: string }
): Promise<ApiResult<Record<string, string>>> {
  const formIds = [...formIdToEventId.keys()];
  if (formIds.length === 0) {
    return ok({});
  }

  const submittedRes = await client
    .from('core_form_responses')
    .select('form_id')
    .eq('respondent_id', actingUserId)
    .eq('status', SUBMITTED_STATUS)
    .in('form_id', formIds);

  if (submittedRes.error) {
    return err({
      code: errorResult.code,
      message: submittedRes.error.message || errorResult.fallbackMessage,
    });
  }

  const submittedFormIds = new Set(
    ((submittedRes.data ?? []) as Array<{ form_id: string }>).map((row) => row.form_id).filter(Boolean)
  );

  const statusByEventId: Record<string, string> = {};
  for (const formId of submittedFormIds) {
    const eventId = formIdToEventId.get(formId);
    if (eventId) {
      statusByEventId[eventId] = SUBMITTED_STATUS;
    }
  }

  const draftCandidateFormIds = formIds.filter((formId) => !submittedFormIds.has(formId));
  if (draftCandidateFormIds.length === 0) {
    return ok(statusByEventId);
  }

  const draftRes = await client
    .from('core_form_responses')
    .select('form_id')
    .eq('respondent_id', actingUserId)
    .eq('status', DRAFT_STATUS)
    .is('workflow_subject_id', null)
    .in('form_id', draftCandidateFormIds);

  if (draftRes.error) {
    return err({
      code: errorResult.code,
      message: draftRes.error.message || errorResult.fallbackMessage,
    });
  }

  for (const row of (draftRes.data ?? []) as Array<{ form_id: string }>) {
    const eventId = formIdToEventId.get(row.form_id);
    if (eventId && !(eventId in statusByEventId)) {
      statusByEventId[eventId] = DRAFT_STATUS;
    }
  }

  return ok(statusByEventId);
}

/**
 * Loads application status for dashboard cards from `base_application`, plus PR16 draft
 * or submitted `core_form_responses` when no application row is visible yet.
 */
export async function fetchApplicationStatusByEventIds(
  client: TypedClient,
  personId: string,
  eventIds: readonly string[],
  errorResult: { code: string; fallbackMessage: string },
  actingUserId?: string | null
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

  if (actingUserId?.trim()) {
    const formsRes = await fetchRegistrationFormsByEventIds(client, eventIds, errorResult);
    if (!isOk(formsRes)) {
      return formsRes as ApiResult<never>;
    }

    const formResponseRes = await fetchFormResponseStatusByEventIds(
      client,
      actingUserId.trim(),
      formsRes.data.formIdToEventId,
      errorResult
    );
    if (!isOk(formResponseRes)) {
      return formResponseRes;
    }

    for (const [eventId, status] of Object.entries(formResponseRes.data)) {
      if (!(eventId in applicationStatusByEventId)) {
        applicationStatusByEventId[eventId] = status;
      }
    }
  }

  return ok(applicationStatusByEventId);
}
