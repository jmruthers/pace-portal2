import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@solvera/pace-core/components';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toTypedSupabase } from '@/lib/supabase-typed';
import { useProxyMode } from '@/shared/hooks/useProxyMode';

/**
 * Surfaces validated delegated (proxy) context — local storage alone is not authority.
 */
export function ProxyModeBanner() {
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const { isProxyActive, isValidating, validationError, targetMemberId, targetPersonId } =
    useProxyMode();

  const { data: targetLabel } = useQuery({
    queryKey: ['proxyBannerTarget', targetPersonId],
    enabled: Boolean(client && targetPersonId && isProxyActive),
    staleTime: 60_000,
    queryFn: async () => {
      if (!client || !targetPersonId) return null;
      const { data, error } = await client
        .from('core_person')
        .select('first_name, last_name')
        .eq('id', targetPersonId)
        .maybeSingle();
      if (error || !data) return null;
      const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
      return name.length > 0 ? name : null;
    },
  });

  if (isValidating) {
    return (
      <Alert>
        <AlertTitle>Checking delegated access</AlertTitle>
        <AlertDescription>Please wait…</AlertDescription>
      </Alert>
    );
  }

  if (validationError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Delegated access</AlertTitle>
        <AlertDescription>{validationError}</AlertDescription>
      </Alert>
    );
  }

  if (!isProxyActive || !targetMemberId) {
    return null;
  }

  const who = targetLabel ?? `Member ${targetMemberId}`;

  return (
    <Alert>
      <AlertTitle>Delegated context active</AlertTitle>
      <AlertDescription>
        You are working on behalf of {who}. Delegated tools use the profile edit route for this member;
        self-service member profile still updates only your own record.
      </AlertDescription>
    </Alert>
  );
}
