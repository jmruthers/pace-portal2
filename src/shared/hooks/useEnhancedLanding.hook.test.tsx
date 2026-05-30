import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { err } from '@solvera/pace-core/types';

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: vi.fn(),
}));

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1' },
    accessibleOrganisations: [{ id: 'org-1' }],
    isLoading: false,
  }),
}));

vi.mock('@/shared/lib/utils/userUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/utils/userUtils')>();
  return {
    ...actual,
    fetchCurrentPersonMember: vi.fn(),
  };
});

import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';
import { useEnhancedLanding } from '@/shared/hooks/useEnhancedLanding';

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useEnhancedLanding (PR02 query wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSecureSupabase).mockReturnValue({ rpc: vi.fn() } as never);
  });

  it('stays loading without fetching when secure client is unavailable', async () => {
    vi.mocked(useSecureSupabase).mockReturnValue(null);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useEnhancedLanding(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(fetchCurrentPersonMember).not.toHaveBeenCalled();
  });

  it('surfaces fetchEnhancedLanding ApiResult errors on the hook', async () => {
    vi.mocked(fetchCurrentPersonMember).mockResolvedValue(
      err({ code: 'ENHANCED_LANDING_QUERY', message: 'Dashboard unavailable' })
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useEnhancedLanding(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/unavailable/i);
  });
});
