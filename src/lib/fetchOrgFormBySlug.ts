/**
 * PR17 — Org-scoped published form load for `/forms/:formSlug`.
 */
import { err, normalizeToApiError, ok, type ApiResult } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import {
  confirmationKeysFromFormRow,
  getOrgFormEligibilityFailure,
  type CoreFormRow,
} from '@/lib/orgFormEligibility';

export type OrgFormBySlugReady = {
  form: CoreFormRow;
  fieldRows: CoreFormFieldRow[];
  confirmationKeys: string[];
};

export async function fetchOrgFormBySlug(
  secure: RBACSupabaseClient | null,
  organisationId: string,
  accessibleOrganisationIds: string[],
  formSlugRaw: string
): Promise<ApiResult<OrgFormBySlugReady>> {
  try {
    const client = toTypedSupabase(secure);
    const fs = formSlugRaw?.trim() ?? '';
    const orgIds =
      accessibleOrganisationIds.length > 0 ? accessibleOrganisationIds : [organisationId];

    if (!client || !organisationId) {
      return err({
        code: 'FORM_LOAD_CONTEXT',
        message: 'Form load requires organisation context.',
      });
    }

    if (!fs) {
      return err({
        code: 'FORM_NOT_FOUND',
        message: 'This form could not be found.',
      });
    }

    let formRes: { data: CoreFormRow | null; error: { message?: string } | null };

    if (orgIds.length === 1) {
      formRes = await client
        .from('core_forms')
        .select('*')
        .eq('organisation_id', organisationId)
        .is('event_id', null)
        .eq('slug', fs)
        .eq('status', 'published')
        .maybeSingle();
    } else {
      formRes = await client
        .from('core_forms')
        .select('*')
        .in('organisation_id', orgIds)
        .is('event_id', null)
        .eq('slug', fs)
        .eq('status', 'published')
        .maybeSingle();
    }

    if (formRes.error) {
      return err({
        code: 'FORM_LOAD_QUERY',
        message: formRes.error.message?.trim() || 'Could not load form.',
      });
    }

    const form = formRes.data as CoreFormRow | null;
    if (!form) {
      return err({
        code: 'FORM_NOT_FOUND',
        message: 'This form could not be found.',
      });
    }

    if (!orgIds.includes(form.organisation_id ?? '')) {
      return err({
        code: 'FORM_NOT_FOUND',
        message: 'This form could not be found.',
      });
    }

    const eligibilityFailure = getOrgFormEligibilityFailure(form);
    if (eligibilityFailure) {
      return err(eligibilityFailure);
    }

    const fieldsRes = await client
      .from('core_form_fields')
      .select('*')
      .eq('form_id', form.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (fieldsRes.error) {
      return err({
        code: 'FORM_LOAD_QUERY',
        message: fieldsRes.error.message?.trim() || 'Could not load form fields.',
      });
    }

    const fieldRows = (fieldsRes.data ?? []) as CoreFormFieldRow[];

    return ok({
      form,
      fieldRows,
      confirmationKeys: confirmationKeysFromFormRow(form),
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'FORM_LOAD', 'Could not load form.'));
  }
}
