import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';

vi.mock('@/lib/env', () => ({
  isSupabaseConfigured: true,
}));

const getSession = vi.fn();
const rpc = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
    supabase: {
      auth: { getSession },
      rpc,
    },
    session: { user: { id: 'u1' } },
    isLoading: false,
    sessionRestoration: { isRestoring: false },
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useLinkedProfiles', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    rpc.mockResolvedValue({
      data: [
        {
          person_id: 'p1',
          first_name: 'A',
          last_name: 'B',
          organisation_name: 'Org',
          permission_type: 'view',
        },
      ],
      error: null,
    });
  });

  it('returns linked profile rows from RPC', async () => {
    const { result } = renderHook(() => useLinkedProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0]?.first_name).toBe('A');
    expect(rpc).toHaveBeenCalledWith('data_pace_linked_profiles_list', { p_user_id: 'u1' });
  });

  it('errors when RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'bad rpc' } });

    const { result } = renderHook(() => useLinkedProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
