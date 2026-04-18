import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';

const fetchCurrentActionPlan = vi.fn();
const coreFileRowToFileReference = vi.fn((row: { id: string; file_path: string }, apId: string) => ({
  id: row.id,
  table_name: 'medi_action_plan',
  record_id: apId,
  file_path: row.file_path,
  file_metadata: { fileName: 'x.pdf', fileType: 'application/pdf' },
  app_id: 'app-1',
  is_public: false,
  created_at: '',
  updated_at: '',
}));

vi.mock('@/hooks/medical-profile/actionPlanOperations', () => ({
  fetchCurrentActionPlan: (client: unknown, conditionId: string) => fetchCurrentActionPlan(client, conditionId),
  coreFileRowToFileReference: (
    row: { id: string; file_path: string },
    actionPlanId: string
  ) => coreFileRowToFileReference(row, actionPlanId),
}));

const mockFrom = vi.fn((table: string) => {
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
              table_name: 'medi_action_plan',
              record_id: 'ap-1',
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

  it('loads action plan and file reference when linked', async () => {
    fetchCurrentActionPlan.mockResolvedValue({
      id: 'ap-1',
      condition_id: 'c1',
      file_reference_id: 'ref-1',
    } as never);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useActionPlanForCondition('c1'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchCurrentActionPlan).toHaveBeenCalledWith(mockTypedClient, 'c1');
    expect(result.current.data?.actionPlan?.id).toBe('ap-1');
    expect(result.current.data?.fileReference?.id).toBe('ref-1');
  });

  it('returns action plan without file when no file_reference_id', async () => {
    fetchCurrentActionPlan.mockResolvedValue({
      id: 'ap-2',
      condition_id: 'c2',
      file_reference_id: null,
    } as never);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useActionPlanForCondition('c2'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.fileReference).toBeNull();
    expect(mockFrom).not.toHaveBeenCalledWith('core_file_references');
  });
});
