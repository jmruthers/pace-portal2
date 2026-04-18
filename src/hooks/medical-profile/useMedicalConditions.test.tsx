import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { defaultMedicalConditionFormValues } from '@/utils/medical-profile/medicalConditionValidation';

const deleteActionPlansForCondition = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/medical-profile/actionPlanOperations', () => ({
  deleteActionPlansForCondition: (...args: unknown[]) => deleteActionPlansForCondition(...args),
}));

const mockFrom = vi.fn((table: string) => {
  if (table === 'medi_condition') {
    return {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-cond' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'c1' }, error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    deleteActionPlansForCondition.mockResolvedValue(undefined);
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

  it('deleteCondition runs action-plan cleanup before deleting medi_condition', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const { result } = renderHook(
      () => useMedicalConditions({ profileId: 'mp1', organisationId: 'org-1' }),
      { wrapper: wrapper(qc) }
    );

    await result.current.deleteCondition.mutateAsync('cond-99');

    expect(deleteActionPlansForCondition).toHaveBeenCalledWith(
      expect.objectContaining({ conditionId: 'cond-99' })
    );
    expect(mockFrom).toHaveBeenCalledWith('medi_condition');
  });
});
