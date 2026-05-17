import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deleteAttachment } from '@solvera/pace-core/crud';
import { isErr } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { uploadFile } from '@solvera/pace-core/utils';
import { toSupabaseClientLike, toTypedSupabase } from '@/lib/supabase-typed';
import {
  ACTION_PLAN_CATEGORY,
  ACTION_PLAN_FOLDER,
  ACTION_PLAN_PAGE_CONTEXT,
} from '@/constants/fileUpload';
import { FILE_STORAGE_BUCKET, FILE_UPLOAD_NO_EVENT_ID } from '@/constants/fileStorage';

type SecureSupabase = NonNullable<ReturnType<typeof useSecureSupabase>>;
type TypedClient = NonNullable<ReturnType<typeof toTypedSupabase>>;

async function linkUploadedActionPlanFile(params: {
  typedClient: TypedClient;
  secure: SecureSupabase;
  conditionId: string;
  newFileReferenceId: string;
  queryClient: QueryClient;
}): Promise<void> {
  const { typedClient, secure, conditionId, newFileReferenceId, queryClient } = params;

  const condition = await typedClient
    .from('medi_condition')
    .select('action_plan_file_id')
    .eq('id', conditionId)
    .maybeSingle();
  if (condition.error || !condition.data) {
    throw new Error(condition.error?.message ?? 'Could not load condition for file upload.');
  }

  const previousRefId = condition.data.action_plan_file_id ?? null;

  const link = await typedClient
    .from('medi_condition')
    .update({
      action_plan_file_id: newFileReferenceId,
      action_plan_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', conditionId)
    .select('id');
  if (link.error) {
    throw new Error(link.error.message ?? 'Could not link uploaded action plan file.');
  }
  const updatedRows = Array.isArray(link.data) ? link.data.length : 0;
  if (updatedRows !== 1) {
    throw new Error(
      'Could not link uploaded action plan file. You may not have permission to update this condition.'
    );
  }

  if (previousRefId && previousRefId !== newFileReferenceId) {
    const refRow = await typedClient
      .from('core_file_references')
      .select('file_path')
      .eq('id', previousRefId)
      .maybeSingle();
    const previousPath = refRow.data?.file_path ?? null;
    if (previousPath) {
      const del = await deleteAttachment({
        secureClient: secure,
        adapter: {
          metadataTable: 'core_file_references',
          storageBucket: FILE_STORAGE_BUCKET,
          columns: {
            id: 'id',
            filePath: 'file_path',
            relationId: 'record_id',
            relationTable: 'table_name',
          },
        },
        metadataId: previousRefId,
        filePath: previousPath,
        continueOnStorageFailure: true,
      });
      if (isErr(del) && import.meta.env.DEV) {
        console.warn('pace-portal: action plan file replace', del.error.message);
      }
    } else {
      await typedClient.from('core_file_references').delete().eq('id', previousRefId);
    }
  }

  await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
  await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
}

/**
 * Persists an action-plan file directly on `medi_condition.action_plan_file_id`.
 */
export function useActionPlanFileAttachment() {
  const secure = useSecureSupabase();
  const typedClient = toTypedSupabase(secure);
  const supabaseLike = toSupabaseClientLike(secure);
  const queryClient = useQueryClient();

  const persistActionPlanFile = useCallback(
    async (input: {
      pendingFile: File;
      conditionId: string;
      appId: string;
      organisationId: string;
    }) => {
      if (!typedClient || !supabaseLike || !secure) {
        throw new Error('Application context is not ready. Try again.');
      }

      const uploaded = await uploadFile({
        client: supabaseLike,
        file: input.pendingFile,
        options: {
          bucket: FILE_STORAGE_BUCKET,
          table_name: 'medi_condition',
          record_id: input.conditionId,
          organisation_id: input.organisationId,
          event_id: FILE_UPLOAD_NO_EVENT_ID,
          app_id: input.appId,
          category: ACTION_PLAN_CATEGORY,
          folder: ACTION_PLAN_FOLDER,
          pageContext: ACTION_PLAN_PAGE_CONTEXT,
          is_public: false,
        },
      });

      try {
        await linkUploadedActionPlanFile({
          typedClient,
          secure,
          conditionId: input.conditionId,
          newFileReferenceId: uploaded.file_reference.id,
          queryClient,
        });
      } catch (linkError) {
        const newPath = uploaded.file_reference.file_path ?? null;
        if (newPath) {
          const orphanDel = await deleteAttachment({
            secureClient: secure,
            adapter: {
              metadataTable: 'core_file_references',
              storageBucket: FILE_STORAGE_BUCKET,
              columns: {
                id: 'id',
                filePath: 'file_path',
                relationId: 'record_id',
                relationTable: 'table_name',
              },
            },
            metadataId: uploaded.file_reference.id,
            filePath: newPath,
            continueOnStorageFailure: true,
          });
          if (isErr(orphanDel) && import.meta.env.DEV) {
            console.warn('pace-portal: action plan orphan cleanup', orphanDel.error.message);
          }
        } else {
          await typedClient.from('core_file_references').delete().eq('id', uploaded.file_reference.id);
        }
        throw linkError;
      }
    },
    [queryClient, secure, supabaseLike, typedClient]
  );

  return {
    persistActionPlanFile,
    isReady: Boolean(typedClient && supabaseLike && secure),
  };
}
