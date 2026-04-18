import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({ from: mockFrom }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useMediConditionTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads active condition types only', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, name: 'A', is_active: true, parent_id: null },
            { id: 2, name: 'B', is_active: false, parent_id: null },
          ],
          error: null,
        }),
      }),
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMediConditionTypes(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((r) => r.id)).toEqual([1]);
    expect(mockFrom).toHaveBeenCalledWith('medi_condition_type');
  });
});
