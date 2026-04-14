import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { PROXY_TARGET_MEMBER_STORAGE_KEY } from '@/constants';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type ProxyModeState = {
  /** True when local storage had a target and RPC granted access. */
  isProxyActive: boolean;
  /** Member row the viewer is acting for (when active). */
  targetMemberId: string | null;
  targetPersonId: string | null;
  /** Auth user performing the action (for attribution). */
  actingUserId: string | null;
  validationError: string | null;
  isValidating: boolean;
};

function readStoredMemberId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROXY_TARGET_MEMBER_STORAGE_KEY);
    if (!raw) return null;
    return raw;
  } catch (e: unknown) {
    if (import.meta.env.DEV) console.warn('pace-portal: proxy storage read failed', e);
    return null;
  }
}

function writeStoredMemberId(memberId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (memberId === null) {
      localStorage.removeItem(PROXY_TARGET_MEMBER_STORAGE_KEY);
    } else {
      localStorage.setItem(PROXY_TARGET_MEMBER_STORAGE_KEY, memberId);
    }
  } catch (e: unknown) {
    if (import.meta.env.DEV) console.warn('pace-portal: proxy storage write failed', e);
  }
}

/**
 * Delegated profile proxy: persists a target member id in localStorage, validates with RPC before exposing person id.
 * Local state alone is never treated as authority.
 */
export function useProxyMode() {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);
  const actingUserId = user?.id ?? null;

  const [targetMemberId, setTargetMemberId] = useState<string | null>(() => readStoredMemberId());
  const [targetPersonId, setTargetPersonId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateAndResolve = useCallback(async () => {
    if (!secure || !client || !targetMemberId) {
      setTargetPersonId(null);
      setValidationError(null);
      setIsValidating(false);
      return;
    }
    setIsValidating(true);
    setValidationError(null);
    try {
      const rpcResult = (await secure.rpc(
        // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern -- shared schema RPC name
        'check_user_pace_member_access_via_member_id',
        { p_member_id: targetMemberId }
      )) as { data: boolean | null; error: Error | null };
      const allowed = rpcResult.data;
      const rpcError = rpcResult.error;

      if (rpcError) {
        writeStoredMemberId(null);
        setTargetMemberId(null);
        setTargetPersonId(null);
        setValidationError('Proxy access could not be verified.');
        return;
      }

      if (allowed !== true) {
        writeStoredMemberId(null);
        setTargetMemberId(null);
        setTargetPersonId(null);
        setValidationError('Proxy access was denied.');
        return;
      }

      const { data: member, error: memberError } = await client
        .from('core_member')
        .select('person_id')
        .eq('id', targetMemberId)
        .maybeSingle();

      if (memberError || !member?.person_id) {
        writeStoredMemberId(null);
        setTargetMemberId(null);
        setTargetPersonId(null);
        setValidationError('Could not resolve delegated profile.');
        return;
      }

      setTargetPersonId(member.person_id);
    } finally {
      setIsValidating(false);
    }
  }, [client, secure, targetMemberId]);

  useEffect(() => {
    void validateAndResolve();
  }, [validateAndResolve]);

  const clearProxy = useCallback(() => {
    writeStoredMemberId(null);
    setTargetMemberId(null);
    setTargetPersonId(null);
    setValidationError(null);
  }, []);

  const setProxyTargetMemberId = useCallback((memberId: string | null) => {
    if (memberId === null) {
      clearProxy();
      return;
    }
    writeStoredMemberId(memberId);
    setTargetMemberId(memberId);
  }, [clearProxy]);

  const isProxyActive = Boolean(targetMemberId && targetPersonId && !validationError);

  const metadata = useMemo(
    () =>
      ({
        targetMemberId,
        targetPersonId,
        actingUserId,
        isProxyActive,
      }) satisfies {
        targetMemberId: string | null;
        targetPersonId: string | null;
        actingUserId: string | null;
        isProxyActive: boolean;
      },
    [actingUserId, isProxyActive, targetMemberId, targetPersonId]
  );

  return {
    isProxyActive,
    targetMemberId,
    targetPersonId,
    actingUserId,
    validationError,
    isValidating,
    clearProxy,
    setProxyTargetMemberId,
    /** Metadata for downstream delegated-write attribution. */
    proxyAttribution: metadata,
  };
}
