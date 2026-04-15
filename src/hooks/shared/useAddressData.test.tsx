import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddressData } from '@/hooks/shared/useAddressData';

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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAddressData', () => {
  it('marks address unresolved when no id is linked', () => {
    const { result } = renderHook(() => useAddressData(null), { wrapper });
    expect(result.current.addressData.isUnresolved).toBe(true);
    expect(result.current.addressData.residential).toBeNull();
  });

  it('loads residential row and resolves when labelled', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'a1',
          full_address: '1 Example Rd',
          place_id: 'ChIJtest',
          country: null,
          created_at: '2020-01-01',
          created_by: null,
          lat: null,
          lng: null,
          organisation_id: null,
          postcode: null,
          route: null,
          state: null,
          street_number: null,
          suburb: null,
          updated_at: null,
          updated_by: null,
        },
        error: null,
      }),
    }));

    const { result } = renderHook(() => useAddressData('a1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.addressData.residential?.full_address).toBe('1 Example Rd');
    expect(result.current.addressData.isUnresolved).toBe(false);
  });
});
