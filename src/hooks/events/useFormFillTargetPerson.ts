import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type FormFillProxyFlag = {
  isProxyActive: boolean;
};

/** Delegated person display row for form header when proxy mode is active (PR15). */
export function useFormFillTargetPerson(
  proxy: FormFillProxyFlag,
  effectivePersonId: string | null
) {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  return useQuery({
    queryKey: ['formFillTargetPerson', effectivePersonId, proxy.isProxyActive],
    enabled: Boolean(client && proxy.isProxyActive && effectivePersonId),
    staleTime: 15_000,
    queryFn: async () => {
      const r = await client!
        .from('core_person')
        .select('first_name,last_name,email')
        .eq('id', effectivePersonId!)
        .maybeSingle();
      if (r.error) throw new Error(r.error.message);
      return r.data as { first_name: string | null; last_name: string | null; email: string | null } | null;
    },
  });
}
