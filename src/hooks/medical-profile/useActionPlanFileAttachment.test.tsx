import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActionPlanFileAttachment } from '@/hooks/medical-profile/useActionPlanFileAttachment';

const uploadFile = vi.fn();
const deleteAttachment = vi.fn().mockResolvedValue({ ok: true, data: undefined });

const mediMocks = {
  maybeSingleCondition: vi.fn(),
  selectAfterLink: vi.fn(),
};

function mediConditionTable() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: mediMocks.maybeSingleCondition,
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: mediMocks.selectAfterLink,
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
            data: { file_path: 'files/old.pdf' },
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

const mockRbacSecureClient = { __rbacSecureClient: true as const };

vi.mock('@solvera/pace-core/utils', () => ({
  uploadFile: (...args: unknown[]) => uploadFile(...args),
}));

vi.mock('@solvera/pace-core/crud', () => ({
  deleteAttachment: (...args: unknown[]) => deleteAttachment(...args),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({ from: mockFrom }),
  toSupabaseClientLike: () => ({}),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mockRbacSecureClient,
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useActionPlanFileAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadFile.mockResolvedValue({
      file_reference: {
        id: 'ref-new',
        file_path: 'files/new.pdf',
      },
    });
    mediMocks.maybeSingleCondition.mockResolvedValue({
      data: { action_plan_file_id: 'ref-old' },
      error: null,
    });
    mediMocks.selectAfterLink.mockResolvedValue({
      data: [{ id: 'c1' }],
      error: null,
    });
  });

  it('uploads file, links condition, and invalidates medical queries', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const inv = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await result.current.persistActionPlanFile({
      pendingFile: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
      conditionId: 'c1',
      appId: 'app-1',
      organisationId: 'org-1',
    });

    expect(uploadFile).toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          pageContext: 'medical-profile',
          organisation_id: 'org-1',
        }),
      })
    );
    expect(mockFrom).toHaveBeenCalledWith('medi_condition');
    await waitFor(() => {
      expect(inv).toHaveBeenCalledWith({ queryKey: ['mediActionPlan'] });
      expect(inv).toHaveBeenCalledWith({ queryKey: ['medicalProfile'] });
    });
  });

  it('passes secure RBAC client into old-file cleanup', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await result.current.persistActionPlanFile({
      pendingFile: new File([new Uint8Array([1])], 'b.pdf', { type: 'application/pdf' }),
      conditionId: 'c1',
      appId: 'app-1',
      organisationId: 'org-1',
    });

    expect(deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ secureClient: mockRbacSecureClient })
    );
  });

  it('rejects when linking updates zero rows', async () => {
    mediMocks.selectAfterLink.mockResolvedValueOnce({
      data: [],
      error: null,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await expect(
      result.current.persistActionPlanFile({
        pendingFile: new File([new Uint8Array([1])], 'c.pdf', { type: 'application/pdf' }),
        conditionId: 'c1',
        appId: 'app-1',
        organisationId: 'org-1',
      })
    ).rejects.toThrow(/permission/i);

    expect(deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataId: 'ref-new',
        filePath: 'files/new.pdf',
      })
    );
  });
});
