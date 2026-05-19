import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFormAdditionalContactsPreview } from '@/hooks/events/useFormAdditionalContactsPreview';

const mockRpc = vi.fn();

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () =>
    ({
      rpc: mockRpc,
    }) as never,
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFormAdditionalContactsPreview', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns grouped rows when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          contact_id: 'c1',
          contact_person_id: 'p2',
          contact_type_id: 't1',
          contact_type_name: 'Parent',
          email: '',
          first_name: 'Sam',
          last_name: 'Contact',
          member_id: 'm1',
          organisation_id: 'o1',
          permission_type: '',
          phone_number: '',
          phone_type: '',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useFormAdditionalContactsPreview('m1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty list when RPC yields no rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useFormAdditionalContactsPreview('m1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('fails the query when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'contacts rpc failed' } });

    const { result } = renderHook(() => useFormAdditionalContactsPreview('m1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
