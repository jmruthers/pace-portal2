import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';

type CreateRpc = Database['public']['Functions']['app_pace_contact_create'];
type DeleteRpc = Database['public']['Functions']['app_pace_contact_delete'];
type UpdateRpc = Database['public']['Functions']['app_pace_contact_update'];

export type CreateContactInput = {
  memberId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  email?: string | null;
  contactTypeId: string;
  permissionType: string;
  phoneNumber?: string | null;
  phoneTypeId?: number | null;
};

export type UpdateContactInput = {
  contactId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  email?: string | null;
  contactTypeId: string;
  permissionType: string;
  phoneNumber?: string | null;
  phoneTypeId?: number | null;
};

export type UseContactOperationsResult = {
  createContact: UseMutationResult<void, Error, CreateContactInput>;
  deleteContact: UseMutationResult<void, Error, string>;
  updateContact: UseMutationResult<void, Error, UpdateContactInput>;
};

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const normalized = (value ?? '').trim();
  return normalized === '' ? undefined : normalized;
}

/**
 * Contact mutations for additional contacts (create, update, delete).
 * Invalidates additional-contacts list queries on successful mutations.
 */
export function useContactOperations(): UseContactOperationsResult {
  const queryClient = useQueryClient();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const createContact = useMutation<void, Error, CreateContactInput>({
    mutationFn: async (input) => {
      if (!client) {
        throw new Error('Client is not available.');
      }
      const memberId = input.memberId.trim();
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const contactTypeId = input.contactTypeId.trim();
      const normalizedEmail = normalizeOptionalText(input.email);
      const normalizedPreferredName = normalizeOptionalText(input.preferredName);
      const normalizedPhoneNumber = normalizeOptionalText(input.phoneNumber);
      if (!memberId || !firstName || !lastName || !contactTypeId) {
        throw new Error('contact_type_id, member_id, first_name, and last_name are required');
      }
      const { data, error } = await client.rpc('app_pace_contact_create', {
        p_member_id: memberId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_preferred_name: normalizedPreferredName,
        p_email: normalizedEmail,
        p_contact_type_id: contactTypeId,
        p_permission_type: input.permissionType,
        p_phone_number: normalizedPhoneNumber,
        p_phone_type_id: input.phoneTypeId ?? undefined,
      } satisfies CreateRpc['Args']);
      if (error) {
        throw new Error(error.message || 'Could not create contact.');
      }
      const rows = data ?? [];
      if (rows.length === 0) {
        throw new Error('Contact could not be created.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['additionalContacts', 'v1'] });
    },
  });

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

  const updateContact = useMutation<void, Error, UpdateContactInput>({
    mutationFn: async (input) => {
      if (!client) {
        throw new Error('Client is not available.');
      }
      const normalizedEmail = normalizeOptionalText(input.email);
      const normalizedPreferredName = normalizeOptionalText(input.preferredName);
      const normalizedPhoneNumber = normalizeOptionalText(input.phoneNumber);
      const { data, error } = await client.rpc('app_pace_contact_update', {
        p_contact_id: input.contactId,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_preferred_name: normalizedPreferredName,
        p_email: normalizedEmail,
        p_contact_type_id: input.contactTypeId,
        p_permission_type: input.permissionType,
        p_phone_number: normalizedPhoneNumber,
        p_phone_type_id: input.phoneTypeId ?? undefined,
      } satisfies UpdateRpc['Args']);
      if (error) {
        throw new Error(error.message || 'Could not update contact.');
      }
      const rows = data ?? [];
      if (rows.length === 0) {
        throw new Error('Contact could not be updated.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['additionalContacts', 'v1'] });
    },
  });

  return { createContact, deleteContact, updateContact };
}
