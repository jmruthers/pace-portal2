import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ok } from '@solvera/pace-core/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useResolveEventByCode } from '@/shared/hooks/useResolveEventByCode';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

const fetchMock = vi.fn();

vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase');
  return {
    ...actual,
    fetchEventExistsWithCaseFallback: (...args: unknown[]) => fetchMock(...args),
    hasSupabaseBrowserConfig: () => true,
  };
});

function wrapper(client: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useResolveEventByCode', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('returns missing for reserved slugs', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useResolveEventByCode('dashboard'), {
      wrapper: wrapper(client),
    });
    expect(result.current).toBe('missing');
  });

  it('returns found when the event exists', async () => {
    fetchMock.mockResolvedValue(ok(true));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useResolveEventByCode('summer-camp'), {
      wrapper: wrapper(client),
    });
    await waitFor(() => {
      expect(result.current).toBe('found');
    });
    expect(fetchMock).toHaveBeenCalledWith('summer-camp', 'u1', 'org-1');
  });

  it('returns missing when the event does not exist', async () => {
    fetchMock.mockResolvedValue(ok(false));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useResolveEventByCode('unknown'), {
      wrapper: wrapper(client),
    });
    await waitFor(() => {
      expect(result.current).toBe('missing');
    });
  });
});
