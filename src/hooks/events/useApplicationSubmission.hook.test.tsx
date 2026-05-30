import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { err, isErr, isOk, ok } from '@solvera/pace-core/types';

const submitEventApplicationMock = vi.hoisted(() => vi.fn());
const useSecureSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/eventApplicationSubmission', () => ({
  submitEventApplication: (...args: unknown[]) => submitEventApplicationMock(...args),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => useSecureSupabaseMock(),
}));

import { useApplicationSubmission } from '@/hooks/events/useApplicationSubmission';

const baseInput = {
  actingUserId: 'u1',
  applicantPersonId: 'p1',
  organisationId: 'org-1',
  eventId: 'ev-1',
  formId: 'form-1',
  fieldRows: [],
};

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useApplicationSubmission (PR16 submit mutation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSecureSupabaseMock.mockReturnValue({ rpc: vi.fn() });
    submitEventApplicationMock.mockResolvedValue(ok({ applicationId: 'app-1' }));
  });

  it('returns VALIDATION_FAILED when secure client or input is missing', async () => {
    useSecureSupabaseMock.mockReturnValue(null);
    const qc = new QueryClient();
    const { result } = renderHook(() => useApplicationSubmission(baseInput), {
      wrapper: wrapper(qc),
    });

    let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined;
    await act(async () => {
      outcome = await result.current.submit({ q1: 'a' });
    });

    expect(outcome).toBeDefined();
    expect(isErr(outcome!)).toBe(true);
    if (isErr(outcome!)) expect(outcome.error.code).toBe('VALIDATION_FAILED');
    expect(submitEventApplicationMock).not.toHaveBeenCalled();
  });

  it('delegates to submitEventApplication on success', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useApplicationSubmission(baseInput), {
      wrapper: wrapper(qc),
    });

    let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined;
    await act(async () => {
      outcome = await result.current.submit({ q1: 'answer' });
    });

    expect(isOk(outcome!)).toBe(true);
    expect(submitEventApplicationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formValues: { q1: 'answer' },
        organisationId: 'org-1',
      })
    );
  });

  it('surfaces RPC failure from submitEventApplication', async () => {
    submitEventApplicationMock.mockResolvedValue(
      err({ code: 'APPLICATION_RPC_FAILED', message: 'RPC failed' })
    );
    const qc = new QueryClient();
    const { result } = renderHook(() => useApplicationSubmission(baseInput), {
      wrapper: wrapper(qc),
    });

    let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined;
    await act(async () => {
      outcome = await result.current.submit({});
    });

    expect(isErr(outcome!)).toBe(true);
    if (isErr(outcome!)) expect(outcome.error.code).toBe('APPLICATION_RPC_FAILED');
  });

});
