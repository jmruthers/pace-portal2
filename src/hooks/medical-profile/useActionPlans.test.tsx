import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';

const mockFrom = vi.fn((table: string) => {
  if (table === 'medi_condition') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              action_plan_file_id: 'ref-1',
              action_plan_date: '2025-01-10',
            },
            error: null,
          }),
        }),
      }),
    };
  }
  if (table === 'core_file_references') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'ref-1',
              file_path: 'p/x.pdf',
              file_metadata: { fileName: 'x.pdf', fileType: 'application/pdf' },
              app_id: 'app-1',
              is_public: false,
              created_at: null,
              updated_at: null,
            },
            error: null,
          }),
        }),
      }),
    };
  }
  return {};
});

const mockTypedClient = { from: mockFrom };

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => mockTypedClient,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useActionPlanForCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nulls when conditionId is null', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useActionPlanForCondition(null), { wrapper: wrapper(qc) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('loads condition action-plan file reference when linked', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useActionPlanForCondition('c1'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.actionPlanDate).toBe('2025-01-10');
    expect(result.current.data?.fileReference?.id).toBe('ref-1');
  });

  it('returns no file when condition has no linked file id', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'medi_condition') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { action_plan_file_id: null, action_plan_date: null },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useActionPlanForCondition('c2'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.actionPlanDate).toBeNull();
    expect(result.current.data?.fileReference).toBeNull();
    expect(mockFrom).not.toHaveBeenCalledWith('core_file_references');
  });
});
