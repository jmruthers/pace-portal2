import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProfilePhotoFileRows } from '@/shared/hooks/useProfilePhotoFileRows';

const mockRpc = vi.fn();

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({ rpc: mockRpc }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useProfilePhotoFileRows', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('loads file rows for person when enabled', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'f1', file_path: 'p/a.jpg', file_metadata: {}, is_public: false, created_at: 't' }],
      error: null,
    });

    const { result } = renderHook(
      () => useProfilePhotoFileRows('person-1', 'org-1', true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(result.current.data?.length).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith(
      'data_file_reference_by_category_list',
      expect.objectContaining({
        p_record_id: 'person-1',
        p_table_name: 'core_person',
        p_user_id: 'u1',
      })
    );
  });

  it('does not run when disabled', () => {
    const { result } = renderHook(
      () => useProfilePhotoFileRows('person-1', 'org-1', false),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
