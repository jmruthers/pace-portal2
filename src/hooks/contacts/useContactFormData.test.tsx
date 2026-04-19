import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContactFormReferenceData, useContactPersonLookup } from '@/hooks/contacts/useContactFormData';

const fromMock = vi.fn();

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({
    from: fromMock,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useContactFormData', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('loads contact form reference data', async () => {
    fromMock.mockImplementation((table: string) => ({
      select: () => ({
        order: () => {
          if (table === 'core_contact_type') {
            return Promise.resolve({
              data: [{ id: 'ct-1', name: 'Emergency', sort_order: 1 }],
              error: null,
            });
          }
          return Promise.resolve({
            data: [{ id: 1, name: 'Mobile' }],
            error: null,
          });
        },
      }),
    }));
    const { result } = renderHook(() => useContactFormReferenceData(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.contactTypes).toHaveLength(1);
      expect(result.current.data?.phoneTypes).toHaveLength(1);
    });
  });

  it('finds person by email', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            limit: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'p1',
                    first_name: 'Sam',
                    last_name: 'Lee',
                    preferred_name: 'Sam',
                    email: 'sam@example.com',
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useContactPersonLookup(), { wrapper });
    const lookup = await result.current.findByEmail('sam@example.com');
    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.data?.person_id).toBe('p1');
    }
  });

  it('returns null when no email match exists', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useContactPersonLookup(), { wrapper });
    const lookup = await result.current.findByEmail('none@example.com');
    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.data).toBeNull();
    }
  });

  it('surfaces reference-query errors', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: null,
            error: { message: 'rpc failed' },
          }),
      }),
    }));

    const { result } = renderHook(() => useContactFormReferenceData(), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toMatch(/rpc failed/i);
  });
});
