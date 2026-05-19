/**
 * PR17 — Org-scoped published form load for `/forms/:formSlug`.
 */
import { err, normalizeToApiError, ok, type ApiResult } from '@solvera/pace-core/types';
import { getWorkflowPreSubmissionCheckKeys } from '@solvera/pace-core/forms';
import type { WorkflowFormDefinition } from '@solvera/pace-core/forms';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

export type OrgFormBySlugReady = {
  form: CoreFormRow;
  fieldRows: CoreFormFieldRow[];
  confirmationKeys: string[];
};

/** Org `/forms/:slug` rows always have `event_id` null — apply opens/closes window only (not dashboard event-card rules). */
function orgFormWithinResponseWindow(
  form: Pick<CoreFormRow, 'opens_at' | 'closes_at'>,
  now: Date
): boolean {
  const t = now.getTime();
  if (form.opens_at != null && form.opens_at !== '') {
    const opens = Date.parse(form.opens_at);
    if (Number.isFinite(opens) && opens > t) {
      return false;
    }
  }
  if (form.closes_at != null && form.closes_at !== '') {
    const closes = Date.parse(form.closes_at);
    if (Number.isFinite(closes) && closes < t) {
      return false;
    }
  }
  return true;
}

function workflowStubFromFormRow(form: CoreFormRow): WorkflowFormDefinition {
  return {
    id: form.id,
    slug: form.slug,
    name: form.name,
    description: form.description ?? undefined,
    workflowType: form.workflow_type as WorkflowFormDefinition['workflowType'],
    accessMode: form.access_mode as WorkflowFormDefinition['accessMode'],
    status: form.status as WorkflowFormDefinition['status'],
    opensAt: form.opens_at,
    closesAt: form.closes_at,
    workflowConfig: (form.workflow_config ?? {}) as WorkflowFormDefinition['workflowConfig'],
    fields: [],
  };
}

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

    if (form.access_mode !== 'authenticated_member') {
      return err({
        code: 'FORM_ACCESS_MODE',
        message: 'This form is not available for signed-in members via this route.',
      });
    }

    if (form.is_active === false) {
      return err({
        code: 'FORM_INACTIVE',
        message: 'This form is not active.',
      });
    }

    const now = new Date();
    if (!orgFormWithinResponseWindow(form, now)) {
      return err({
        code: 'FORM_WINDOW_CLOSED',
        message: 'This form is not open for responses right now.',
      });
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
    const confirmationKeys = getWorkflowPreSubmissionCheckKeys(workflowStubFromFormRow(form));

    return ok({
      form,
      fieldRows,
      confirmationKeys,
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'FORM_LOAD', 'Could not load form.'));
  }
}
