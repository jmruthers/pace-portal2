import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActionPlanFileAttachment } from '@/hooks/medical-profile/useActionPlanFileAttachment';

const ensureActionPlanRow = vi.fn();
const attachActionPlanFile = vi.fn();
const replaceActionPlanFile = vi.fn();

/** Stable stand-in for `useSecureSupabase()` (RBAC session; same hook used in proxy/delegated flows). */
const mockRbacSecureClient = { __rbacSecureClient: true as const };

vi.mock('@/hooks/medical-profile/actionPlanOperations', () => ({
  ensureActionPlanRow: (...args: unknown[]) => ensureActionPlanRow(...args),
  attachActionPlanFile: (...args: unknown[]) => attachActionPlanFile(...args),
  replaceActionPlanFile: (...args: unknown[]) => replaceActionPlanFile(...args),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
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
  });

  it('attaches when action plan has no file yet', async () => {
    ensureActionPlanRow.mockResolvedValue({ id: 'ap1', file_reference_id: null });
    attachActionPlanFile.mockResolvedValue({});

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const inv = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await result.current.persistActionPlanFile({
      pendingFile: new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }),
      conditionId: 'c1',
      organisationId: 'org-1',
      appId: 'app-1',
    });

    expect(ensureActionPlanRow).toHaveBeenCalled();
    expect(attachActionPlanFile).toHaveBeenCalled();
    expect(replaceActionPlanFile).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(inv).toHaveBeenCalledWith({ queryKey: ['mediActionPlan'] });
    });
  });

  it('replaces when a file is already linked', async () => {
    ensureActionPlanRow.mockResolvedValue({ id: 'ap1', file_reference_id: 'ref-old' });
    replaceActionPlanFile.mockResolvedValue({});

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await result.current.persistActionPlanFile({
      pendingFile: new File([new Uint8Array([1])], 'b.pdf', { type: 'application/pdf' }),
      conditionId: 'c1',
      organisationId: 'org-1',
      appId: 'app-1',
    });

    expect(replaceActionPlanFile).toHaveBeenCalled();
    expect(attachActionPlanFile).not.toHaveBeenCalled();
  });

  it('passes the RBAC secure client into replace (proxy/delegated medical profile uses the same client)', async () => {
    ensureActionPlanRow.mockResolvedValue({ id: 'ap1', file_reference_id: 'ref-old' });
    replaceActionPlanFile.mockResolvedValue({});

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useActionPlanFileAttachment(), { wrapper: wrapper(qc) });

    await result.current.persistActionPlanFile({
      pendingFile: new File([new Uint8Array([1])], 'b.pdf', { type: 'application/pdf' }),
      conditionId: 'c1',
      organisationId: 'org-1',
      appId: 'app-1',
    });

    expect(replaceActionPlanFile).toHaveBeenCalledWith(
      expect.objectContaining({ secure: mockRbacSecureClient })
    );
  });
});
