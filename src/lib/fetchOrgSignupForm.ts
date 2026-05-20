import { err, normalizeToApiError, ok, type ApiResult } from '@solvera/pace-core/types';
import type { OrganisationId } from '@solvera/pace-core/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';
import type { OrgSignupFormReady } from '@/lib/memberRequestTypes';
import {
  confirmationKeysFromFormRow,
  getOrgFormEligibilityFailure,
  type CoreFormRow,
} from '@/lib/orgFormEligibility';

/**
 * PR22 — Published org signup form for inline member request flow.
 * Uses the same participant eligibility rules as PR17 `fetchOrgFormBySlug`.
 */
export async function fetchOrgSignupForm(
  client: SupabaseClient<Database>,
  organisationId: OrganisationId
): Promise<ApiResult<OrgSignupFormReady | null>> {
  try {
    const orgId = organisationId.trim();
    if (!orgId) {
      return err({ code: 'ORG_SIGNUP_ORG', message: 'Organisation is required.' });
    }

    const formRes = await client
      .from('core_forms')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('workflow_type', 'org_signup')
      .eq('status', 'published')
      .is('event_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (formRes.error) {
      return err({
        code: 'ORG_SIGNUP_QUERY',
        message: formRes.error.message ?? 'Could not load organisation form.',
      });
    }

    const form = formRes.data as CoreFormRow | null;
    if (!form) {
      return ok(null);
    }

    const eligibilityFailure = getOrgFormEligibilityFailure(form);
    if (eligibilityFailure) {
      return ok(null);
    }

    const fieldsRes = await client
      .from('core_form_fields')
      .select('*')
      .eq('form_id', form.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (fieldsRes.error) {
      return err({
        code: 'ORG_SIGNUP_FIELDS',
        message: fieldsRes.error.message ?? 'Could not load form fields.',
      });
    }

    const fieldRows = (fieldsRes.data ?? []) as CoreFormFieldRow[];

    return ok({
      formId: form.id,
      formTitle: form.name?.trim() || 'Organisation signup',
      formDescription: form.description,
      fieldRows,
      confirmationKeys: confirmationKeysFromFormRow(form),
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'ORG_SIGNUP', 'Could not load organisation form.'));
  }
}
