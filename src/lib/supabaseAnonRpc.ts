/**
 * BA07 anonymous token RPC bridge: base `anon` client is required (no session, no secure wrapper).
 * RPC names are fixed by BASE BA07 (PR20).
 */
import { supabaseClient } from '@/lib/supabase';

type RpcResult = { data: unknown; error: { message?: string } | null };

type RpcFn = (fn: string, args: Record<string, string | null>) => Promise<RpcResult>;

function invokeRpc(fn: string, args: Record<string, string | null>): Promise<RpcResult> {
  return (supabaseClient as unknown as { rpc: RpcFn }).rpc(fn, args);
}

export async function appBaseApplicationCheckResolveToken(p_raw_token: string): Promise<RpcResult> {
  return invokeRpc('app_base_application_check_resolve_token', { p_raw_token });
}

export async function appBaseApplicationCheckSubmit(args: {
  p_raw_token: string;
  p_outcome: string;
  p_notes: string | null;
}): Promise<RpcResult> {
  return invokeRpc('app_base_application_check_submit', args);
}
