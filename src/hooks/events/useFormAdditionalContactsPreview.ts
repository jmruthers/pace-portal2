import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import {
  groupFlatContactRows,
  type FlatContactRpcRow,
} from '@/utils/contacts/groupAdditionalContactRows';

function normalizeContactRpcRows(rows: Array<Record<string, unknown>>): FlatContactRpcRow[] {
  return rows
    .map((row) => {
      const contactTypeId = String(row.contact_type_id ?? '').trim();
      if (contactTypeId === '') return null;
      return {
        contact_id: String(row.contact_id ?? ''),
        contact_person_id: String(row.contact_person_id ?? ''),
        contact_type_id: contactTypeId,
        contact_type_name: String(row.contact_type_name ?? ''),
        email: String(row.email ?? ''),
        first_name: String(row.first_name ?? ''),
        last_name: String(row.last_name ?? ''),
        member_id: String(row.member_id ?? ''),
        organisation_id: String(row.organisation_id ?? ''),
        permission_type: String(row.permission_type ?? ''),
        phone_number: String(row.phone_number ?? ''),
        phone_type: String(row.phone_type ?? ''),
      } satisfies FlatContactRpcRow;
    })
    .filter((row): row is FlatContactRpcRow => row != null);
}

/** Loads grouped additional contacts for form confirmation (PR15). */
export function useFormAdditionalContactsPreview(memberId: string | null) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  return useQuery({
    queryKey: ['formAdditionalContactsPreview', memberId],
    enabled: Boolean(client && memberId),
    staleTime: 20_000,
    queryFn: async () => {
      if (!client || !memberId) return [];
      const r = await client.rpc('data_pace_member_contacts_list', { p_member_id: memberId });
      if (r.error) throw new Error(r.error.message);
      const rows = (r.data ?? []) as Array<Record<string, unknown>>;
      return groupFlatContactRows(normalizeContactRpcRows(rows));
    },
  });
}
