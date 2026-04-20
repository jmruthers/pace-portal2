import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  err,
  isOk,
  normalizeToApiError,
  ok,
  type ApiResult,
} from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import type { Database } from '@/types/pace-database';
import type { EmailPersonMatch } from '@/hooks/contacts/useContactFormState';

type ContactTypeRow = Database['public']['Tables']['core_contact_type']['Row'];
type PhoneTypeRow = Database['public']['Tables']['core_phone_type']['Row'];

export type ContactFormReferenceData = {
  contactTypes: ContactTypeRow[];
  phoneTypes: PhoneTypeRow[];
};

async function fetchContactFormReferenceData(
  client: ReturnType<typeof toTypedSupabase>
): Promise<ApiResult<ContactFormReferenceData>> {
  try {
    if (!client) {
      return err({
        code: 'CONTACT_FORM_CONTEXT',
        message: 'Reference data requires authenticated context.',
      });
    }
    const [contactTypesRes, phoneTypesRes] = await Promise.all([
      client.from('core_contact_type').select('*').order('sort_order', { ascending: true }),
      client.from('core_phone_type').select('*').order('name', { ascending: true }),
    ]);
    const firstError = contactTypesRes.error ?? phoneTypesRes.error;
    if (firstError) {
      return err({
        code: 'CONTACT_FORM_REFERENCES',
        message: firstError.message || 'Could not load contact references.',
      });
    }
    return ok({
      contactTypes: contactTypesRes.data ?? [],
      phoneTypes: phoneTypesRes.data ?? [],
    });
  } catch (error) {
    return err(
      normalizeToApiError(error, 'CONTACT_FORM_REFERENCES', 'Could not load contact references.')
    );
  }
}

export function useContactFormReferenceData() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const query = useQuery({
    queryKey: ['contactFormReferences', 'v1'],
    enabled: Boolean(client),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: async () => fetchContactFormReferenceData(client),
  });

  const apiError = query.data && !isOk(query.data) ? query.data.error : null;
  return {
    ...query,
    data: query.data && isOk(query.data) ? query.data.data : undefined,
    error: apiError
      ? new Error(apiError.message)
      : query.error instanceof Error
        ? query.error
        : null,
    isError: Boolean(apiError) || query.isError,
    isSuccess: query.isSuccess && !apiError,
  };
}

export function useContactPersonLookup() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  const findByEmail = useCallback(
    async (email: string): Promise<ApiResult<EmailPersonMatch | null>> => {
      try {
        if (!client) {
          return err({
            code: 'CONTACT_FORM_CONTEXT',
            message: 'Email lookup requires authenticated context.',
          });
        }
        const { data, error } = await client
          .from('core_person')
          .select('id, first_name, last_name, preferred_name, email')
          .eq('email', email)
          .is('deleted_at', null)
          .limit(1);
        if (error) {
          return err({
            code: 'CONTACT_EMAIL_LOOKUP',
            message: error.message || 'Could not match email.',
          });
        }
        const row = data?.[0];
        if (!row) {
          return ok(null);
        }
        const primaryPhone = await client
          .from('core_phone')
          .select('phone_number, phone_type_id')
          .eq('person_id', row.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (primaryPhone.error) {
          return err({
            code: 'CONTACT_EMAIL_LOOKUP',
            message: primaryPhone.error.message || 'Could not load matched phone details.',
          });
        }
        return ok({
          person_id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          preferred_name: row.preferred_name,
          email: row.email,
          phone_number: primaryPhone.data?.phone_number ?? null,
          phone_type_id: primaryPhone.data?.phone_type_id ?? null,
        });
      } catch (error) {
        return err(normalizeToApiError(error, 'CONTACT_EMAIL_LOOKUP', 'Could not match email.'));
      }
    },
    [client]
  );

  return { findByEmail };
}
