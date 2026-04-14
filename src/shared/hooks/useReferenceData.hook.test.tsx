import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useReferenceData } from '@/shared/hooks/useReferenceData';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: [] as { id: number }[], error: null })),
  })),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({ from: mockFrom }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useReferenceData', () => {
  it('fetches reference bundle when typed client exists', async () => {
    const { result } = renderHook(() => useReferenceData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.phoneTypes).toEqual([]);
    expect(mockFrom).toHaveBeenCalled();
  });
});
