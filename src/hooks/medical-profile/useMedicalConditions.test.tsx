import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { defaultMedicalConditionFormValues } from '@/utils/medical-profile/medicalConditionValidation';

const deleteAttachment = vi.fn().mockResolvedValue({ ok: true, data: undefined });

vi.mock('@solvera/pace-core/crud', () => ({
  deleteAttachment: (...args: unknown[]) => deleteAttachment(...args),
}));

/** Shared handles so every `from('medi_condition')` chain observes the same mock behaviour. */
const mediMocks = {
  insertSingle: vi.fn(),
  selectAfterUpdate: vi.fn(),
  selectAfterDelete: vi.fn(),
  maybeSingleCondition: vi.fn(),
};

function mediConditionTable() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mediMocks.insertSingle,
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: mediMocks.selectAfterUpdate,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: mediMocks.selectAfterDelete,
      }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: mediMocks.maybeSingleCondition,
      }),
    }),
  };
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'medi_condition') {
    return mediConditionTable();
  }
  if (table === 'core_file_references') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { file_path: 'files/path.pdf' },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  return {};
});

const mockTypedClient = { from: mockFrom };

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => mockTypedClient,
  toSupabaseClientLike: () => ({}),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useMedicalConditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteAttachment.mockResolvedValue({ ok: true, data: undefined });
    mediMocks.insertSingle.mockResolvedValue({ data: { id: 'new-cond' }, error: null });
    mediMocks.selectAfterUpdate.mockResolvedValue({
      data: [{ id: 'c1' }],
      error: null,
    });
    mediMocks.selectAfterDelete.mockResolvedValue({
      data: [{ id: 'cond-99' }],
      error: null,
    });
    mediMocks.maybeSingleCondition.mockResolvedValue({
      data: { action_plan_file_id: 'ref-1' },
      error: null,
    });
  });

  it('creates a condition and invalidation keys are wired via mutation success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const inv = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    const values = { ...defaultMedicalConditionFormValues(), condition_type_id: 1 };
    await result.current.createCondition.mutateAsync(values);

    await waitFor(() => {
      expect(inv).toHaveBeenCalledWith({ queryKey: ['medicalProfile'] });
      expect(inv).toHaveBeenCalledWith({ queryKey: ['mediActionPlan'] });
    });
  });

  it('updateCondition persists changes', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    const values = { ...defaultMedicalConditionFormValues(), condition_type_id: 2 };
    await result.current.updateCondition.mutateAsync({ id: 'c-up', values });

    expect(mockFrom).toHaveBeenCalledWith('medi_condition');
  });

  it('updateCondition rejects when no rows were updated', async () => {
    mediMocks.selectAfterUpdate.mockResolvedValueOnce({
      data: [],
      error: null,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    const values = { ...defaultMedicalConditionFormValues(), condition_type_id: 2 };
    await expect(result.current.updateCondition.mutateAsync({ id: 'c-up', values })).rejects.toThrow(
      /no rows were updated/i
    );
  });

  it('deleteCondition unlinks and removes linked action-plan file before deleting condition', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    await result.current.deleteCondition.mutateAsync('cond-99');

    expect(deleteAttachment).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('medi_condition');
  });

  it('deleteCondition rejects when condition row was not deleted', async () => {
    mediMocks.selectAfterDelete.mockResolvedValueOnce({
      data: [],
      error: null,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    await expect(result.current.deleteCondition.mutateAsync('cond-99')).rejects.toThrow(/no rows were deleted/i);
  });
});
