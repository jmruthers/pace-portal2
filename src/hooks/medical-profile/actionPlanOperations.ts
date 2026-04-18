/**
 * PR11 — action-plan file persistence: `medi_action_plan` + `core_file_references` + storage.
 * Uses pace-core `uploadFile` and `deleteAttachment` (ordered updates to satisfy FKs).
 */
import { deleteAttachment } from '@solvera/pace-core/crud';
import { isErr } from '@solvera/pace-core/types';
import type { FileMetadata, FileReference } from '@solvera/pace-core/types';
import { buildStoragePath, uploadFile, type SupabaseClientLike } from '@solvera/pace-core/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import {
  ACTION_PLAN_CATEGORY,
  ACTION_PLAN_FOLDER,
  ACTION_PLAN_PAGE_CONTEXT,
} from '@/constants/fileUpload';

type MediActionPlanRow = Database['public']['Tables']['medi_action_plan']['Row'];
type MediActionPlanInsert = Database['public']['Tables']['medi_action_plan']['Insert'];
type CoreFileRow = Database['public']['Tables']['core_file_references']['Row'];

export function coreFileRowToFileReference(row: CoreFileRow, actionPlanId: string): FileReference {
  const raw = row.file_metadata;
  const file_metadata: FileMetadata =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? {
          fileName: String((raw as Record<string, unknown>).fileName ?? 'document'),
          fileType: String((raw as Record<string, unknown>).fileType ?? 'application/octet-stream'),
          ...(raw as Record<string, unknown>),
        }
      : { fileName: 'document', fileType: 'application/octet-stream' };

  return {
    id: row.id,
    table_name: 'medi_action_plan',
    record_id: actionPlanId,
    file_path: row.file_path,
    file_metadata,
    app_id: row.app_id,
    is_public: row.is_public === true,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
  };
}

const FILE_ADAPTER = {
  metadataTable: 'core_file_references',
  storageBucket: 'files',
  columns: {
    id: 'id',
    filePath: 'file_path',
    relationId: 'record_id',
    relationTable: 'table_name',
  },
} as const;

function distinctReplacementFile(file: File): File {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dot = file.name.lastIndexOf('.');
  const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : '';
  return new File([file], `${stem}-replace-${stamp}${ext}`, { type: file.type });
}

export async function fetchCurrentActionPlan(
  client: SupabaseClient<Database>,
  conditionId: string
): Promise<MediActionPlanRow | null> {
  const q = await client
    .from('medi_action_plan')
    .select('*')
    .eq('condition_id', conditionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (q.error) throw new Error(q.error.message ?? 'Could not load action plan.');
  return q.data;
}

export async function ensureActionPlanRow(input: {
  client: SupabaseClient<Database>;
  conditionId: string;
  organisationId: string;
}): Promise<MediActionPlanRow> {
  const existing = await fetchCurrentActionPlan(input.client, input.conditionId);
  if (existing) return existing;

  const row: MediActionPlanInsert = {
    condition_id: input.conditionId,
    organisation_id: input.organisationId,
    date_received: new Date().toISOString().slice(0, 10),
    description: 'Action plan',
    is_current: true,
  };
  const ins = await input.client.from('medi_action_plan').insert(row).select('*').single();
  if (ins.error || !ins.data) {
    throw new Error(ins.error?.message ?? 'Could not create action plan row.');
  }
  return ins.data;
}

export async function attachActionPlanFile(input: {
  supabase: SupabaseClientLike;
  typedClient: SupabaseClient<Database>;
  actionPlanId: string;
  appId: string;
  file: File;
}): Promise<FileReference> {
  const uploaded = await uploadFile({
    client: input.supabase,
    file: input.file,
    options: {
      table_name: 'medi_action_plan',
      record_id: input.actionPlanId,
      app_id: input.appId,
      category: ACTION_PLAN_CATEGORY,
      folder: ACTION_PLAN_FOLDER,
      pageContext: ACTION_PLAN_PAGE_CONTEXT,
      is_public: false,
    },
  });

  const upd = await input.typedClient
    .from('medi_action_plan')
    .update({ file_reference_id: uploaded.file_reference.id })
    .eq('id', input.actionPlanId)
    .select('id')
    .single();

  if (upd.error) {
    const path = uploaded.file_reference.file_path;
    const bucket = input.supabase.storage.from('files');
    if (bucket.remove) {
      await bucket.remove([path]);
    }
    await input.typedClient.from('core_file_references').delete().eq('id', uploaded.file_reference.id);
    throw new Error(upd.error.message ?? 'Could not link uploaded file.');
  }

  return uploaded.file_reference;
}

export async function replaceActionPlanFile(input: {
  secure: unknown;
  supabase: SupabaseClientLike;
  typedClient: SupabaseClient<Database>;
  actionPlan: MediActionPlanRow;
  appId: string;
  file: File;
}): Promise<FileReference> {
  const existingRefId = input.actionPlan.file_reference_id;
  let existingPath: string | null = null;
  if (existingRefId) {
    const refRow = await input.typedClient
      .from('core_file_references')
      .select('file_path')
      .eq('id', existingRefId)
      .maybeSingle();
    if (refRow.data?.file_path) existingPath = refRow.data.file_path;
  }

  const fileToUpload = distinctReplacementFile(input.file);

  const uploaded = await uploadFile({
    client: input.supabase,
    file: fileToUpload,
    options: {
      table_name: 'medi_action_plan',
      record_id: input.actionPlan.id,
      app_id: input.appId,
      category: ACTION_PLAN_CATEGORY,
      folder: ACTION_PLAN_FOLDER,
      pageContext: ACTION_PLAN_PAGE_CONTEXT,
      is_public: false,
    },
  });

  const newRef = uploaded.file_reference;
  const upd = await input.typedClient
    .from('medi_action_plan')
    .update({ file_reference_id: newRef.id })
    .eq('id', input.actionPlan.id)
    .select('id')
    .single();

  if (upd.error) {
    const bucket = input.supabase.storage.from('files');
    if (bucket.remove) {
      await bucket.remove([newRef.file_path]);
    }
    await input.typedClient.from('core_file_references').delete().eq('id', newRef.id);
    throw new Error(upd.error.message ?? 'Could not update action plan with new file.');
  }

  if (existingRefId && existingPath) {
    const del = await deleteAttachment({
      secureClient: input.secure,
      adapter: FILE_ADAPTER,
      metadataId: existingRefId,
      filePath: existingPath,
    });
    if (isErr(del)) {
      throw new Error(del.error.message);
    }
  }

  return newRef;
}

/**
 * Removes action-plan rows and linked files for a condition (before deleting `medi_condition`).
 */
export async function deleteActionPlansForCondition(input: {
  secure: unknown;
  supabase: SupabaseClientLike;
  typedClient: SupabaseClient<Database>;
  conditionId: string;
}): Promise<void> {
  void input.supabase;

  const plans = await input.typedClient
    .from('medi_action_plan')
    .select('id, file_reference_id')
    .eq('condition_id', input.conditionId);

  if (plans.error) throw new Error(plans.error.message ?? 'Could not load action plans.');

  const rows = plans.data ?? [];
  for (const plan of rows) {
    const refId = plan.file_reference_id;
    let path: string | null = null;
    if (refId) {
      const ref = await input.typedClient
        .from('core_file_references')
        .select('file_path')
        .eq('id', refId)
        .maybeSingle();
      path = ref.data?.file_path ?? null;
    }

    const nullFk = await input.typedClient
      .from('medi_action_plan')
      .update({ file_reference_id: null })
      .eq('id', plan.id);
    if (nullFk.error) throw new Error(nullFk.error.message ?? 'Could not unlink action plan file.');

    if (refId && path) {
      const del = await deleteAttachment({
        secureClient: input.secure,
        adapter: FILE_ADAPTER,
        metadataId: refId,
        filePath: path,
        continueOnStorageFailure: true,
      });
      if (isErr(del) && import.meta.env.DEV) {
        console.warn('pace-portal: action plan file delete', del.error.message);
      }
    } else if (refId && !path) {
      await input.typedClient.from('core_file_references').delete().eq('id', refId);
    }

    const rm = await input.typedClient.from('medi_action_plan').delete().eq('id', plan.id);
    if (rm.error) throw new Error(rm.error.message ?? 'Could not delete action plan.');
  }
}

export function expectedStoragePathForActionPlan(actionPlanId: string, fileName: string): string {
  return buildStoragePath(
    {
      pageContext: ACTION_PLAN_PAGE_CONTEXT,
      folder: ACTION_PLAN_FOLDER,
      category: ACTION_PLAN_CATEGORY,
      record_id: actionPlanId,
    },
    fileName
  );
}
