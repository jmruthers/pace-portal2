import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toSupabaseClientLike, toTypedSupabase } from '@/lib/supabase-typed';
import {
  attachActionPlanFile,
  ensureActionPlanRow,
  replaceActionPlanFile,
} from '@/hooks/medical-profile/actionPlanOperations';

/**
 * PR11 — persists an action-plan file after `medi_condition` exists (attach or replace with rollback in operations layer).
 * Keeps file lifecycle out of presentational components.
 *
 * **Deferred pick vs `FileUpload`:** pace-core `FileUpload` uploads immediately on file selection. This flow must wait
 * until the condition row exists, then link storage to `medi_action_plan`, so we validate client-side first and call
 * `attachActionPlanFile` / `replaceActionPlanFile` after save (same secure client as the rest of medical profile,
 * including delegated/proxy sessions).
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
      organisationId: string;
      appId: string;
    }) => {
      if (!typedClient || !supabaseLike || !secure) {
        throw new Error('Application context is not ready. Try again.');
      }
      const ap = await ensureActionPlanRow({
        client: typedClient,
        conditionId: input.conditionId,
        organisationId: input.organisationId,
      });
      if (ap.file_reference_id) {
        await replaceActionPlanFile({
          secure,
          supabase: supabaseLike,
          typedClient,
          actionPlan: ap,
          appId: input.appId,
          file: input.pendingFile,
        });
      } else {
        await attachActionPlanFile({
          supabase: supabaseLike,
          typedClient,
          actionPlanId: ap.id,
          appId: input.appId,
          file: input.pendingFile,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
    },
    [queryClient, secure, supabaseLike, typedClient]
  );

  return {
    persistActionPlanFile,
    isReady: Boolean(typedClient && supabaseLike && secure),
  };
}
