import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';

type RpcResult = { data: unknown; error: { message?: string } | null };

function resolveBaseRpcClient(client: RBACSupabaseClient): RBACSupabaseClient {
  const maybeSecure = client as RBACSupabaseClient & { _base?: RBACSupabaseClient };
  return maybeSecure._base ?? client;
}

/**
 * Sets organisation/event context on the base client, then runs one RPC without the secure
 * wrapper re-applying the app-switcher organisation (required for BA05a submit contracts).
 */
export async function runRpcWithOrganisationContext(
  client: RBACSupabaseClient,
  organisationId: string,
  eventId: string,
  rpcName: string,
  params: Record<string, unknown>
): Promise<RpcResult> {
  const base = resolveBaseRpcClient(client);
  // BASE session context RPC (not portal-owned); name is fixed in database.
  const ctxRes = (await base.rpc('set_organisation_context', {
    p_organisation_id: organisationId,
    p_event_id: eventId,
    p_app_id: null,
  })) as RpcResult;

  if (ctxRes.error) {
    return ctxRes;
  }

  return (await base.rpc(rpcName, params)) as RpcResult;
}
