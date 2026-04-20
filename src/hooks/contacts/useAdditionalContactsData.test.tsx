import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import * as supabaseTyped from '@/lib/supabase-typed';
import * as userUtils from '@/shared/lib/utils/userUtils';
import { useAdditionalContactsData } from '@/hooks/contacts/useAdditionalContactsData';

const rpc = vi.fn();

const proxyModeImpl = vi.hoisted(() =>
  vi.fn(() => ({
    isProxyActive: false,
    isValidating: false,
    validationError: null as string | null,
    targetMemberId: null as string | null,
    targetPersonId: null as string | null,
    actingUserId: 'u1',
    clearProxy: vi.fn(),
    setProxyTargetMemberId: vi.fn(),
    proxyAttribution: {},
  }))
);

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-1' } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxyModeImpl(),
}));

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

const sampleRow = {
  contact_id: 'c1',
  contact_person_id: 'p1',
  contact_type_id: 1,
  contact_type_name: 'Emergency',
  email: 'x@y.z',
  first_name: 'A',
  last_name: 'B',
  member_id: 'm1',
  organisation_id: 'org-1',
  permission_type: 'view',
  phone_number: '1',
  phone_type: 'M',
};

describe('useAdditionalContactsData', () => {
  beforeEach(() => {
    rpc.mockReset();
    proxyModeImpl.mockImplementation(() => ({
      isProxyActive: false,
      isValidating: false,
      validationError: null,
      targetMemberId: null,
      targetPersonId: null,
      actingUserId: 'u1',
      clearProxy: vi.fn(),
      setProxyTargetMemberId: vi.fn(),
      proxyAttribution: {},
    }));
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({ rpc } as never);
    vi.spyOn(userUtils, 'fetchCurrentPersonMember').mockResolvedValue({
      ok: true,
      data: {
        person: { id: 'p-self' },
        member: { id: 'm-self' },
        usedReducedFieldFallback: false,
      },
    } as never);
  });

  it('loads self-service contacts via data_pace_member_contacts_list', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'data_pace_member_contacts_list') {
        return Promise.resolve({ data: [sampleRow], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useAdditionalContactsData(), {
      wrapper: createWrapper('/additional-contacts'),
    });

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1);
    });
    expect(result.current.mode).toBe('self');
    expect(rpc).toHaveBeenCalledWith('data_pace_member_contacts_list', { p_member_id: 'm-self' });
  });

  it('loads proxy contacts via data_pace_member_contacts_list when proxy is active', async () => {
    proxyModeImpl.mockImplementation(() => ({
      isProxyActive: true,
      isValidating: false,
      validationError: null,
      targetMemberId: 'm-target',
      targetPersonId: 'p-target',
      actingUserId: 'u1',
      clearProxy: vi.fn(),
      setProxyTargetMemberId: vi.fn(),
      proxyAttribution: {},
    }));

    rpc.mockImplementation((name: string) => {
      if (name === 'data_pace_member_contacts_list') {
        return Promise.resolve({ data: [sampleRow], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useAdditionalContactsData(), {
      wrapper: createWrapper('/additional-contacts?targetMemberId=m-target'),
    });

    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1);
    });
    expect(result.current.mode).toBe('proxy');
    expect(rpc).toHaveBeenCalledWith('data_pace_member_contacts_list', {
      p_member_id: 'm-target',
    });
  });

  it('sets isProxyResolving when URL has targetMemberId and proxy is validating', () => {
    proxyModeImpl.mockImplementation(() => ({
      isProxyActive: false,
      isValidating: true,
      validationError: null,
      targetMemberId: null,
      targetPersonId: null,
      actingUserId: 'u1',
      clearProxy: vi.fn(),
      setProxyTargetMemberId: vi.fn(),
      proxyAttribution: {},
    }));

    const { result } = renderHook(() => useAdditionalContactsData(), {
      wrapper: createWrapper('/additional-contacts?targetMemberId=m1'),
    });

    expect(result.current.isProxyResolving).toBe(true);
  });
});
