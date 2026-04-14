import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useResolvedAppId } from '@/shared/hooks/useResolvedAppId';

const mockRpc = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
    appId: null as string | null,
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

describe('useResolvedAppId', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns resolved app id from data_app_resolve', async () => {
    mockRpc.mockResolvedValue({
      data: [{ app_id: 'app-resolved' }],
      error: null,
    });

    const { result } = renderHook(() => useResolvedAppId(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe('app-resolved'), { timeout: 5000 });
    expect(mockRpc).toHaveBeenCalledWith('data_app_resolve', {
      p_app_name: 'pace',
      p_user_id: 'u1',
    });
  });
});
