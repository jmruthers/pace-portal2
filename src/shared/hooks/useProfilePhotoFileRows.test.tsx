import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProfilePhotoFileRows } from '@/shared/hooks/useProfilePhotoFileRows';

const mockSelect = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: mockSelect,
          }),
        }),
      }),
    }),
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useProfilePhotoFileRows', () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it('loads profile photo rows for person when secure client is available', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: 'f1',
          file_path: 'org/p.jpg',
          file_metadata: { category: 'profile_photo' },
          is_public: false,
          created_at: '2026-05-21T00:00:00Z',
          app_id: 'app-1',
        },
        {
          id: 'f0',
          file_path: 'org/other.pdf',
          file_metadata: { category: 'other' },
          is_public: false,
          created_at: '2026-05-20T00:00:00Z',
          app_id: 'app-1',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useProfilePhotoFileRows('person-1', 'org-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0]?.id).toBe('f1');
  });

  it('includes legacy profile_photos category rows', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: 'legacy',
          file_path: 'org/legacy.jpg',
          file_metadata: { category: 'profile_photos' },
          is_public: false,
          created_at: '2025-01-01T00:00:00Z',
          app_id: null,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useProfilePhotoFileRows('person-1', 'org-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
  });

  it('does not run when person id is missing', () => {
    const { result } = renderHook(() => useProfilePhotoFileRows(null, 'org-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
