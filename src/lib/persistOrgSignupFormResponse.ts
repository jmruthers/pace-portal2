import { createOrganisationId, err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import type { OrganisationId } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistDraftValues } from '@/lib/eventDraftPersistence';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

const DRAFT_STATUS = 'draft';

function stripConfirmations(formValues: Record<string, unknown>): Record<string, unknown> {
  const { confirmations: _c, ...rest } = formValues;
  void _c;
  return rest;
}

/**
 * PR22 — Draft org signup response for `app_submit_member_request` (TM01 contract).
 * `respondent_id` must be auth user id; workflow subject must be unset until RPC links the request.
 */
export async function persistOrgSignupFormResponse(
  client: SupabaseClient<Database>,
  input: {
    actingUserId: string;
    organisationId: OrganisationId;
    formId: string;
    fieldRows: CoreFormFieldRow[];
    formValues: Record<string, unknown>;
    existingResponseId?: string | null;
  }
): Promise<ApiResult<string>> {
  const orgIdTyped = createOrganisationId(input.organisationId);
  let responseId = input.existingResponseId?.trim() ?? '';

  if (!responseId) {
    const rins = await client
      .from('core_form_responses')
      .insert({
        form_id: input.formId,
        organisation_id: orgIdTyped,
        respondent_id: input.actingUserId.trim(),
        status: DRAFT_STATUS,
        workflow_subject_type: null,
        workflow_subject_id: null,
      })
      .select('id')
      .single();

    if (rins.error || !rins.data?.id) {
      return err({
        code: 'ORG_SIGNUP_RESPONSE_CREATE',
        message: rins.error?.message ?? 'Could not save form answers.',
      });
    }
    responseId = rins.data.id;
  }

  const dynamic = stripConfirmations(input.formValues);
  const persistRes = await persistDraftValues(
    client,
    input.organisationId,
    responseId,
    input.fieldRows,
    dynamic
  );
  if (!isOk(persistRes)) {
    return err({
      code: persistRes.error.code ?? 'ORG_SIGNUP_PERSIST',
      message: persistRes.error.message ?? 'Could not save form answers.',
    });
  }

  return ok(responseId);
}
