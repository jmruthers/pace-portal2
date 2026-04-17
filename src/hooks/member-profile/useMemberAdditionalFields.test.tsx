import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemberAdditionalFields } from '@/hooks/member-profile/useMemberAdditionalFields';

vi.mock('@/shared/hooks/useReferenceData', () => ({
  useReferenceData: () => ({
    data: {
      phoneTypes: [],
      membershipTypes: [],
      genderTypes: [],
      pronounTypes: [],
    },
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMemberAdditionalFields', () => {
  it('delegates to useReferenceData', () => {
    const { result } = renderHook(() => useMemberAdditionalFields(), { wrapper });
    expect(result.current.data?.phoneTypes).toEqual([]);
  });
});
