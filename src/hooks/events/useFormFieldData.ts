import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { err, isOk, ok, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  buildCatalogueIndex,
  buildFormFieldMeta,
  domainToTableName,
  parseFieldKey,
  type CoreFieldCatalogueRow,
  type CoreFormFieldRow,
} from '@/shared/lib/formFieldMeta';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import type { Database } from '@/types/pace-database';
import type { SupabaseClient } from '@supabase/supabase-js';

type CorePersonRow = Database['public']['Tables']['core_person']['Row'];
type CoreMemberRow = Database['public']['Tables']['core_member']['Row'];
type MediProfileRow = Database['public']['Tables']['medi_profile']['Row'];
type BaseApplicationRow = Database['public']['Tables']['base_application']['Row'];

function collectPrefillTables(fieldRows: CoreFormFieldRow[]): Set<string> {
  const s = new Set<string>();
  for (const row of fieldRows) {
    const p = parseFieldKey(row.field_key);
    if (!p) continue;
    const table = domainToTableName(p.domain);
    if (table) s.add(table);
  }
  return s;
}

function readColumn(obj: Record<string, unknown> | null, columnPath: string): unknown {
  if (obj == null) return '';
  const v = obj[columnPath];
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return String(v);
}

export type FormFieldDataResult = {
  fieldMetas: FormFieldMeta[];
  fieldDefaults: Record<string, unknown>;
  prefillWarning: string | null;
};

/** Exported for unit tests (PR15). */
export async function fetchFieldCatalogueAndPrefill(
  client: SupabaseClient<Database>,
  fieldRows: CoreFormFieldRow[],
  personId: string,
  organisationId: string,
  eventId: string
): Promise<ApiResult<FormFieldDataResult>> {
  const tables = collectPrefillTables(fieldRows);

  const rpcResult = await client.rpc('data_core_field_list_core_form');
  let catalogueIndex = new Map<string, CoreFieldCatalogueRow>();
  let prefillWarning: string | null = null;

  if (rpcResult.error) {
    prefillWarning = rpcResult.error.message ?? 'Could not load field catalogue; using defaults.';
  } else {
    catalogueIndex = buildCatalogueIndex(rpcResult.data as CoreFieldCatalogueRow[] | null);
  }

  const fieldMetas = fieldRows.map((r) => buildFormFieldMeta(r, catalogueIndex));

  let person: CorePersonRow | null = null;
  let member: CoreMemberRow | null = null;
  let medi: MediProfileRow | null = null;
  let application: BaseApplicationRow | null = null;

  try {
    if (tables.has('core_person')) {
      const pr = await client.from('core_person').select('*').eq('id', personId).maybeSingle();
      if (pr.error) throw new Error(pr.error.message);
      person = pr.data as CorePersonRow | null;
    }
    if (tables.has('core_member')) {
      const mr = await client
        .from('core_member')
        .select('*')
        .eq('person_id', personId)
        .eq('organisation_id', organisationId)
        .maybeSingle();
      if (mr.error) throw new Error(mr.error.message);
      member = mr.data as CoreMemberRow | null;
    }
    if (tables.has('medi_profile')) {
      const med = await client.from('medi_profile').select('*').eq('person_id', personId).maybeSingle();
      if (med.error) throw new Error(med.error.message);
      medi = med.data as MediProfileRow | null;
    }
    if (tables.has('base_application')) {
      const ar = await client
        .from('base_application')
        .select('*')
        .eq('person_id', personId)
        .eq('event_id', eventId)
        .maybeSingle();
      if (ar.error) throw new Error(ar.error.message);
      application = ar.data as BaseApplicationRow | null;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not prefill form fields.';
    prefillWarning = prefillWarning ? `${prefillWarning} ${msg}` : msg;
  }

  const tableData: Record<string, Record<string, unknown> | null> = {
    core_person: person as unknown as Record<string, unknown> | null,
    core_member: member as unknown as Record<string, unknown> | null,
    medi_profile: medi as unknown as Record<string, unknown> | null,
    base_application: application as unknown as Record<string, unknown> | null,
  };

  const fieldDefaults: Record<string, unknown> = {};
  for (const row of fieldRows) {
    const parsed = parseFieldKey(row.field_key);
    let value: unknown = '';
    if (parsed) {
      const table = domainToTableName(parsed.domain);
      if (table && tableData[table]) {
        value = readColumn(tableData[table], parsed.columnPath);
      }
    }
    const meta = fieldMetas.find((m) => m.id === row.id);
    if (meta?.fieldType === 'address') {
      fieldDefaults[row.id] =
        value != null && typeof value === 'object' && !Array.isArray(value)
          ? value
          : {
              line1: '',
              line2: '',
              locality: '',
              region: '',
              postalCode: '',
              countryCode: '',
            };
    } else if (meta?.fieldType === 'checkbox') {
      fieldDefaults[row.id] = value === true || value === 'true';
    } else {
      fieldDefaults[row.id] = value === '' || value == null ? '' : String(value);
    }
  }

  return ok({
    fieldMetas,
    fieldDefaults,
    prefillWarning,
  });
}

export function useFormFieldData(
  personId: string | null,
  organisationId: string | null,
  eventId: string | null,
  fieldRows: CoreFormFieldRow[]
) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const stableFields = useMemo(() => fieldRows.map((r) => r.id).join(','), [fieldRows]);

  const query = useQuery({
    queryKey: ['formFieldData', 'v1', personId, organisationId, eventId, stableFields],
    enabled: Boolean(client && personId && organisationId && eventId && fieldRows.length > 0),
    staleTime: 20_000,
    queryFn: async (): Promise<ApiResult<FormFieldDataResult>> => {
      if (!client || !personId || !organisationId || !eventId) {
        return err({ code: 'PREFILL_CONTEXT', message: 'Prefill requires person, organisation, and event.' });
      }
      return fetchFieldCatalogueAndPrefill(client, fieldRows, personId, organisationId, eventId);
    },
  });

  const res = query.data && isOk(query.data) ? query.data.data : undefined;

  const emptyMetas = useMemo(() => {
    const idx = buildCatalogueIndex(null);
    return fieldRows.map((r) => buildFormFieldMeta(r, idx));
  }, [fieldRows]);

  const fieldMetas = res?.fieldMetas ?? emptyMetas;
  const fieldDefaults = res?.fieldDefaults ?? {};
  const prefillWarning = res?.prefillWarning ?? null;

  const apiFailure =
    query.data != null && !isOk(query.data)
      ? (query.data.error.message ?? 'Could not load field defaults.')
      : null;
  const fetchFailure =
    query.error instanceof Error
      ? query.error.message
      : query.error != null
        ? 'Could not load field defaults.'
        : null;
  const fieldLoadError = apiFailure ?? fetchFailure;

  return {
    fieldMetas,
    fieldDefaults,
    prefillWarning,
    fieldLoadError,
    isLoading:
      Boolean(client && personId && organisationId && eventId && fieldRows.length > 0) &&
      (query.isLoading || query.isFetching),
    error: query.error,
    refetch: query.refetch,
  };
}
