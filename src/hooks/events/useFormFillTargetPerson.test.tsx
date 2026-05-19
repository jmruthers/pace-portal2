import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFormFillTargetPerson } from '@/hooks/events/useFormFillTargetPerson';

const mockFrom = vi.fn();

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () =>
    ({
      from: mockFrom,
    }) as never,
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFormFillTargetPerson', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('fetches display fields when proxy is active', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { first_name: 'Pat', last_name: 'Lee', email: 'pat@example.com' },
        error: null,
      }),
    });

    const { result } = renderHook(
      () => useFormFillTargetPerson({ isProxyActive: true }, 'person-target'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      first_name: 'Pat',
      last_name: 'Lee',
      email: 'pat@example.com',
    });
  });

  it('stays idle when proxy is inactive', () => {
    const { result } = renderHook(
      () => useFormFillTargetPerson({ isProxyActive: false }, 'person-target'),
      { wrapper }
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces query error when person row fails to load', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'row missing' },
      }),
    });

    const { result } = renderHook(
      () => useFormFillTargetPerson({ isProxyActive: true }, 'person-x'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
