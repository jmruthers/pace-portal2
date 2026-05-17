import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { err, ok } from '@solvera/pace-core/types';
import { useFormEntrypoint } from '@/hooks/forms/useFormEntrypoint';

const useFormBySlugMock = vi.hoisted(() => vi.fn());
const fetchOrgFormBySlugMock = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1', name: 'Acme Org' },
    organisations: [{ id: 'org-1' }],
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
}));

vi.mock('@/hooks/events/useFormBySlug', () => ({
  useFormBySlug: (...args: unknown[]) => useFormBySlugMock(...args),
}));

vi.mock('@/lib/fetchOrgFormBySlug', () => ({
  fetchOrgFormBySlug: (...args: unknown[]) => fetchOrgFormBySlugMock(...args),
}));

describe('useFormEntrypoint', () => {
  function wrapper(client: QueryClient) {
    return function W({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useFormBySlugMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      notFound: false,
      reservedSlug: false,
      refetch: vi.fn(),
    });
  });

  it('wraps event_application result with kind event and route metadata', async () => {
    useFormBySlugMock.mockReturnValue({
      data: {
        event: { event_name: 'E', event_id: 'ev1' },
        form: { id: 'f1', workflow_type: 'base_registration', title: 'T', name: 'T' },
        fieldRows: [],
        confirmationKeys: [],
      },
      isLoading: false,
      error: null,
      notFound: false,
      reservedSlug: false,
      refetch: vi.fn(),
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFormEntrypoint({ kind: 'event_application', eventSlug: 'camp' }), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.data?.kind).toBe('event'));
    expect(result.current.routeEventSlug).toBe('camp');
    expect(result.current.routeFormSlug).toBe(null);
    expect(useFormBySlugMock).toHaveBeenCalledWith('camp', null);
  });

  it('passes explicit form slug into useFormBySlug for event_form', () => {
    useFormBySlugMock.mockReturnValue({
      data: {
        event: { event_name: 'E', event_id: 'ev1' },
        form: { id: 'f2', workflow_type: 'generic', title: 'F', name: 'F' },
        fieldRows: [],
        confirmationKeys: [],
      },
      isLoading: false,
      error: null,
      notFound: false,
      reservedSlug: false,
      refetch: vi.fn(),
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useFormEntrypoint({ kind: 'event_form', eventSlug: 'camp', formSlug: 'extra' }),
      { wrapper: wrapper(qc) }
    );
    expect(useFormBySlugMock).toHaveBeenCalledWith('camp', 'extra');
    expect(result.current.routeFormSlug).toBe('extra');
  });

  it('maps org slug load onto kind org with shellTitle from organisation context', async () => {
    fetchOrgFormBySlugMock.mockResolvedValue(
      ok({
        form: {
          id: 'form-org',
          name: 'N',
          title: 'N',
          slug: 'staff',
          workflow_type: 'generic',
        },
        fieldRows: [],
        confirmationKeys: [],
      } as never)
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFormEntrypoint({ kind: 'org_form', formSlug: 'staff-onboard' }), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.data?.kind).toBe('org'));
    expect(result.current.data?.kind === 'org' ? result.current.data.shellTitle : null).toBe('Acme Org');
    expect(result.current.routeFormSlug).toBe('staff-onboard');
    expect(result.current.routeEventSlug).toBe(null);
    expect(fetchOrgFormBySlugMock).toHaveBeenCalled();
  });

  it('reflects FORM_NOT_FOUND for org query errors', async () => {
    fetchOrgFormBySlugMock.mockResolvedValue(err({ code: 'FORM_NOT_FOUND', message: 'gone' }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFormEntrypoint({ kind: 'org_form', formSlug: 'x' }), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.notFound).toBe(true));
  });
});
