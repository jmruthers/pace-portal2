import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { useContactOperations } from '@/hooks/contacts/useContactOperations';

const { rpc, rbacState } = vi.hoisted(() => {
  const rpcFn = vi.fn();
  return {
    rpc: rpcFn,
    rbacState: { secure: { rpc: rpcFn } as { rpc: typeof rpcFn } },
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => rbacState.secure,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useContactOperations', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({
      rpc,
    } as never);
  });

  it('calls app_pace_contact_delete and invalidates additionalContacts queries on success', async () => {
    rpc.mockResolvedValue({
      data: [{ deleted: true, id: 'c1' }],
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useContactOperations(), { wrapper: Wrapper });

    await result.current.deleteContact.mutateAsync('c1');

    expect(rpc).toHaveBeenCalledWith('app_pace_contact_delete', { p_contact_id: 'c1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['additionalContacts', 'v1'] });
  });

  it('throws when RPC returns error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'nope' },
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(result.current.deleteContact.mutateAsync('c1')).rejects.toThrow('nope');
  });

  it('throws when deleted flag is false', async () => {
    rpc.mockResolvedValue({
      data: [{ deleted: false, id: 'c1' }],
      error: null,
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(result.current.deleteContact.mutateAsync('c1')).rejects.toThrow(
      /could not be deleted/i
    );
  });
});
