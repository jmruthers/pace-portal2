import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';

type DeleteRpc = Database['public']['Functions']['app_pace_contact_delete'];

export type UseContactOperationsResult = {
  deleteContact: UseMutationResult<void, Error, string>;
};

/**
 * Contact mutations for additional contacts (PR12: delete; PR13 will extend create/update).
 * Invalidates additional-contacts list queries on successful delete.
 */
export function useContactOperations(): UseContactOperationsResult {
  const queryClient = useQueryClient();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const deleteContact = useMutation<void, Error, string>({
    mutationFn: async (contactId: string) => {
      if (!client) {
        throw new Error('Client is not available.');
      }
      const { data, error } = await client.rpc('app_pace_contact_delete', {
        p_contact_id: contactId,
      } satisfies DeleteRpc['Args']);
      if (error) {
        throw new Error(error.message || 'Could not delete contact.');
      }
      const rows = data ?? [];
      const first = rows[0];
      if (!first?.deleted) {
        throw new Error('Contact could not be deleted.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['additionalContacts', 'v1'] });
    },
  });

  return { deleteContact };
}
