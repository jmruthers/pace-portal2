import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAvailableApps } from '@/shared/hooks/useAvailableApps';

vi.mock('@/lib/env', () => ({
  isSupabaseConfigured: true,
}));

const mockRpc = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'user-1' },
    isAuthenticated: true,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({ rpc: mockRpc }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useAvailableApps', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('maps RPC rows to app switcher items', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: '1', name: 'portal', display_name: 'PACE Portal', is_active: true },
        { id: '2', name: 'hidden', display_name: '', is_active: false },
      ],
      error: null,
    });

    const { result } = renderHook(() => useAvailableApps(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0]?.id).toBe('portal');
    expect(mockRpc).toHaveBeenCalledWith('data_rbac_apps_list', { p_user_id: 'user-1' });
  });

  it('surfaces RPC failure as query error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const { result } = renderHook(() => useAvailableApps(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
