import { useQuery } from '@tanstack/react-query';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { toTypedSupabase } from '@/lib/supabase-typed';

type PersonRow = Database['public']['Tables']['core_person']['Row'];
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];
type MemberRow = Database['public']['Tables']['core_member']['Row'];

export type DelegatedProfileViewModel = {
  person: PersonRow;
  phones: PhoneRow[];
  member: MemberRow;
};

/**
 * Loads read-only delegated profile data after server-side access RPC (PR08). Does not set proxy localStorage.
 */
export function useDelegatedProfileView(memberId: string | null) {
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['delegatedProfileView', 'v1', organisationId, memberId],
    enabled: Boolean(client && organisationId && memberId),
    staleTime: 30_000,
    queryFn: async (): Promise<DelegatedProfileViewModel> => {
      if (!secure || !client || !organisationId || !memberId) {
        throw new Error('Delegated profile view requires organisation and member context.');
      }

      const rpcResult = (await secure.rpc(
        // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern -- shared schema RPC name
        'check_user_pace_member_access_via_member_id',
        { p_member_id: memberId }
      )) as { data: boolean | null; error: Error | null };

      if (rpcResult.error) {
        throw new Error('Could not verify delegated access.');
      }
      if (rpcResult.data !== true) {
        throw new Error('Delegated access was denied.');
      }

      const { data: member, error: memberError } = await client
        .from('core_member')
        .select('*')
        .eq('id', memberId)
        .eq('organisation_id', organisationId)
        .maybeSingle();

      if (memberError || !member?.person_id) {
        throw new Error('Could not load member record.');
      }

      const [personRes, phonesRes] = await Promise.all([
        client.from('core_person').select('*').eq('id', member.person_id).maybeSingle(),
        client
          .from('core_phone')
          .select('*')
          .eq('person_id', member.person_id)
          .is('deleted_at', null),
      ]);

      const errBatch = personRes.error ?? phonesRes.error;
      if (errBatch) {
        throw new Error(errBatch.message || 'Could not load profile.');
      }
      if (!personRes.data) {
        throw new Error('Could not load person record.');
      }

      return {
        person: personRes.data,
        phones: phonesRes.data ?? [],
        member,
      };
    },
  });
}
