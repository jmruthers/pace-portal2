import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { useMedicalReferenceData } from '@/hooks/medical-profile/useMedicalReferenceData';

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/shared/hooks/useReferenceData', () => ({
  useReferenceData: () => ({
    data: { phoneTypes: [], membershipTypes: [], genderTypes: [], pronounTypes: [] },
    isLoading: false,
    isError: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMedicalReferenceData', () => {
  beforeEach(() => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              diettype_id: '1',
              diettype_code: 'ST',
              diettype_name: 'Standard',
              diettype_description: null,
            },
          ],
          error: null,
        }),
      })),
    } as never);
  });

  it('exposes diet types when the cake query succeeds', async () => {
    const { result } = renderHook(() => useMedicalReferenceData(), { wrapper });

    await waitFor(() => {
      expect(result.current.dietTypesLoading).toBe(false);
    });
    expect(result.current.dietTypes?.[0]?.diettype_name).toBe('Standard');
  });
});
