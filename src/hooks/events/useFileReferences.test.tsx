import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as rbac from '@solvera/pace-core/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import * as supabaseTyped from '@/lib/supabase-typed';
import * as unified from '@solvera/pace-core';
import * as orgCtx from '@solvera/pace-core/providers';
import * as useResolvedAppId from '@/shared/hooks/useResolvedAppId';
import { useFileReferences } from '@/hooks/events/useFileReferences';

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useFileReferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads latest logo ref per event for core_events files', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    vi.spyOn(useResolvedAppId, 'useResolvedAppId').mockReturnValue('resolved-app-id');
    vi.spyOn(unified, 'useUnifiedAuthContext').mockReturnValue({
      user: { id: 'u1' },
    } as never);
    vi.spyOn(orgCtx, 'useOrganisationsContextOptional').mockReturnValue({
      selectedOrganisation: { id: 'o1', name: 'Org', display_name: 'Org' },
      organisations: [{ id: 'o1', name: 'Org', display_name: 'Org' }],
    } as never);
    vi.spyOn(rbac, 'useSecureSupabase').mockReturnValue({} as never);

    const from = vi.fn((table: string) => {
      if (table === 'core_file_references') {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'f1',
                record_id: 'e1',
                file_path: 'public-files/x/event_logo/a.png',
                is_public: true,
                file_metadata: { category: 'event_logo' },
                created_at: '2024-01-01T00:00:00.000Z',
              },
              {
                id: 'f2',
                record_id: 'e1',
                file_path: 'public-files/x/event_logo/b.png',
                is_public: true,
                file_metadata: { category: 'event_logo' },
                created_at: '2025-01-01T00:00:00.000Z',
              },
            ],
            error: null,
          }),
        };
        return chain;
      }
      return {};
    });

    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ from } as unknown as SupabaseClient<Database>);

    const { result } = renderHook(
      () =>
        useFileReferences([{ event_id: 'e1', organisation_id: 'o1' }]),
      {
        wrapper: wrapper(qc),
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(from).toHaveBeenCalledWith('core_file_references');
    const refs = [...result.current.refByEventId.values()].filter(Boolean);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.record_id).toBe('e1');
    expect(refs[0]?.id).toBe('f2');
  });

  it('marks the query as failed when core_file_references returns an error', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    vi.spyOn(useResolvedAppId, 'useResolvedAppId').mockReturnValue('resolved-app-id');
    vi.spyOn(unified, 'useUnifiedAuthContext').mockReturnValue({
      user: { id: 'u1' },
    } as never);
    vi.spyOn(orgCtx, 'useOrganisationsContextOptional').mockReturnValue({
      selectedOrganisation: { id: 'o1', name: 'Org', display_name: 'Org' },
      organisations: [{ id: 'o1', name: 'Org', display_name: 'Org' }],
    } as never);
    vi.spyOn(rbac, 'useSecureSupabase').mockReturnValue({} as never);

    const from = vi.fn((table: string) => {
      if (table === 'core_file_references') {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'rls deny' },
          }),
        };
        return chain;
      }
      return {};
    });

    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ from } as unknown as SupabaseClient<Database>);

    const { result } = renderHook(() => useFileReferences([{ event_id: 'e1', organisation_id: 'o1' }]), {
      wrapper: wrapper(qc),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toMatch(/rls deny/i);
  });
});
