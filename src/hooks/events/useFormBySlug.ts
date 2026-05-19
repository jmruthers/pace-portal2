import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { type RBACSupabaseClient, useSecureSupabase } from '@solvera/pace-core/rbac';
import { getWorkflowPreSubmissionCheckKeys } from '@solvera/pace-core/forms';
import type { WorkflowFormDefinition } from '@solvera/pace-core/forms';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { isDashboardEligibleForm, type FormRowForDashboardVisibility } from '@/shared/lib/dashboardEventVisibility';
import { lookupEventRowBySlug } from '@/hooks/events/useEventHub';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

export type { CoreFormFieldRow };

type EventRowFull = Database['public']['Tables']['core_events']['Row'];
type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

export type FormBySlugReady = {
  event: EventRowFull;
  form: CoreFormRow;
  fieldRows: CoreFormFieldRow[];
  confirmationKeys: string[];
};

function eligibilityShape(f: Pick<CoreFormRow, 'event_id' | 'status' | 'is_active' | 'opens_at' | 'closes_at'>): FormRowForDashboardVisibility {
  return {
    event_id: f.event_id ?? null,
    status: f.status,
    is_active: f.is_active ?? true,
    opens_at: f.opens_at ?? null,
    closes_at: f.closes_at ?? null,
  };
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

/**
 * Loads published event form metadata for `/:eventSlug/:formSlug` or primary `/application` (PR15).
 */
export async function fetchFormBySlug(
  secure: RBACSupabaseClient | null,
  organisationId: string,
  accessibleOrganisationIds: string[],
  eventSlugRaw: string,
  formSlugExplicit: string | null
): Promise<ApiResult<FormBySlugReady>> {
  try {
    const client = toTypedSupabase(secure);
    const slug = eventSlugRaw?.trim() ?? '';
    const orgIds =
      accessibleOrganisationIds.length > 0 ? accessibleOrganisationIds : [organisationId];

    if (!client || !organisationId) {
      return err({
        code: 'FORM_LOAD_CONTEXT',
        message: 'Form load requires organisation context.',
      });
    }

    if (!slug || isReservedEventSlug(slug)) {
      return err({
        code: 'EVENT_NOT_FOUND',
        message: 'Event could not be found.',
      });
    }

    const eventLookup = await lookupEventRowBySlug(client, slug, orgIds);
    if (!isOk(eventLookup)) {
      return eventLookup;
    }
    const event = eventLookup.data;
    const now = new Date();

    let formRes: { data: CoreFormRow | null; error: { message?: string } | null };
    if (formSlugExplicit != null && formSlugExplicit.trim() !== '') {
      const fs = formSlugExplicit.trim();
      formRes = await client
        .from('core_forms')
        .select('*')
        .eq('event_id', event.event_id)
        .eq('slug', fs)
        .eq('status', 'published')
        .maybeSingle();
    } else {
      formRes = await client
        .from('core_forms')
        .select('*')
        .eq('event_id', event.event_id)
        .eq('workflow_type', 'base_registration')
        .eq('is_primary_entrypoint', true)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .limit(1)
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

    if (!isDashboardEligibleForm(eligibilityShape(form), now)) {
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
      event,
      form,
      fieldRows,
      confirmationKeys,
    });
  } catch (e) {
    return err(normalizeToApiError(e, 'FORM_LOAD', 'Could not load form.'));
  }
}

export function useFormBySlug(eventSlugRaw: string | undefined, formSlugExplicit: string | null) {
  const { user } = useUnifiedAuthContext();
  const org = useOrganisationsContextOptional();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const userId = user?.id ?? null;
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const accessibleOrganisationIds = useMemo(
    () => (org?.organisations ?? []).map((o) => o.id).filter(Boolean),
    [org?.organisations]
  );

  const slug = eventSlugRaw?.trim() ?? '';
  const reserved = slug.length > 0 && isReservedEventSlug(slug);

  const query = useQuery({
    queryKey: [
      'formBySlug',
      'v1',
      userId,
      organisationId,
      accessibleOrganisationIds.join(','),
      slug,
      formSlugExplicit,
    ],
    enabled: Boolean(client && userId && organisationId && slug && !reserved),
    staleTime: 30_000,
    queryFn: async (): Promise<ApiResult<FormBySlugReady>> => {
      if (!userId || !organisationId || !slug) {
        return err({
          code: 'FORM_LOAD_CONTEXT',
          message: 'Form load requires context.',
        });
      }
      return fetchFormBySlug(secure, organisationId, accessibleOrganisationIds, slug, formSlugExplicit);
    },
  });

  const payload = query.data && isOk(query.data) ? query.data.data : undefined;
  const apiError =
    query.data && !isOk(query.data)
      ? query.data.error
      : query.error instanceof Error
        ? { code: 'FORM_LOAD_QUERY', message: query.error.message }
        : null;

  return {
    data: payload,
    isLoading: Boolean(client && userId && organisationId && slug && !reserved) && query.isLoading,
    error: apiError,
    refetch: query.refetch,
    notFound: apiError?.code === 'EVENT_NOT_FOUND' || apiError?.code === 'FORM_NOT_FOUND',
    reservedSlug: slug.length === 0 || reserved,
  };
}
