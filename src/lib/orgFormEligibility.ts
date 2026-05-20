/**
 * Shared org-scoped form eligibility (PR17 `/forms/:slug` + PR22 org signup step).
 */
import { getWorkflowPreSubmissionCheckKeys } from '@solvera/pace-core/forms';
import type { WorkflowFormDefinition } from '@solvera/pace-core/forms';
import type { Database } from '@/types/pace-database';

export type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

export type OrgFormEligibilityFailure = {
  code:
    | 'FORM_ACCESS_MODE'
    | 'FORM_INACTIVE'
    | 'FORM_WINDOW_CLOSED';
  message: string;
};

/** Org forms with `event_id` null — apply opens/closes window only. */
export function orgFormWithinResponseWindow(
  form: Pick<CoreFormRow, 'opens_at' | 'closes_at'>,
  now: Date = new Date()
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

export function getOrgFormEligibilityFailure(
  form: Pick<CoreFormRow, 'access_mode' | 'is_active' | 'opens_at' | 'closes_at'>,
  now: Date = new Date()
): OrgFormEligibilityFailure | null {
  if (form.access_mode !== 'authenticated_member') {
    return {
      code: 'FORM_ACCESS_MODE',
      message: 'This form is not available for signed-in members via this route.',
    };
  }
  if (form.is_active === false) {
    return {
      code: 'FORM_INACTIVE',
      message: 'This form is not active.',
    };
  }
  if (!orgFormWithinResponseWindow(form, now)) {
    return {
      code: 'FORM_WINDOW_CLOSED',
      message: 'This form is not open for responses right now.',
    };
  }
  return null;
}

export function workflowStubFromFormRow(form: CoreFormRow): WorkflowFormDefinition {
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

export function confirmationKeysFromFormRow(form: CoreFormRow): string[] {
  return getWorkflowPreSubmissionCheckKeys(workflowStubFromFormRow(form));
}
