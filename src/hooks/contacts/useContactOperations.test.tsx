import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseTyped from '@/lib/supabase-typed';
import { useContactOperations } from '@/hooks/contacts/useContactOperations';

const { rpc, rbacState } = vi.hoisted(() => {
  const rpcFn = vi.fn();
  return {
    rpc: rpcFn,
    rbacState: { secure: { rpc: rpcFn } as { rpc: typeof rpcFn } },
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => rbacState.secure,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useContactOperations', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue({
      rpc,
    } as never);
  });

  it('calls app_pace_contact_delete and invalidates additionalContacts queries on success', async () => {
    rpc.mockResolvedValue({
      data: [{ deleted: true, id: 'c1' }],
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useContactOperations(), { wrapper: Wrapper });

    await result.current.deleteContact.mutateAsync('c1');

    expect(rpc).toHaveBeenCalledWith('app_pace_contact_delete', { p_contact_id: 'c1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['additionalContacts', 'v1'] });
  });

  it('calls app_pace_contact_create and invalidates additionalContacts queries on success', async () => {
    rpc.mockResolvedValue({
      data: [{ contact_id: 'c1' }],
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useContactOperations(), { wrapper: Wrapper });

    await result.current.createContact.mutateAsync({
      memberId: 'm1',
      firstName: 'Sam',
      lastName: 'Lee',
      preferredName: 'Sam',
      email: 'sam@example.com',
      contactTypeId: 'ct-1',
      permissionType: 'view',
      phoneNumber: '0400',
      phoneTypeId: 1,
    });

    expect(rpc).toHaveBeenCalledWith(
      'app_pace_contact_create',
      expect.objectContaining({
        p_member_id: 'm1',
        p_first_name: 'Sam',
        p_last_name: 'Lee',
        p_email: 'sam@example.com',
        p_contact_type_id: 'ct-1',
        p_permission_type: 'view',
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['additionalContacts', 'v1'] });
  });

  it('calls app_pace_contact_update and invalidates additionalContacts queries on success', async () => {
    rpc.mockResolvedValue({
      data: [{ id: 'c1' }],
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useContactOperations(), { wrapper: Wrapper });

    await result.current.updateContact.mutateAsync({
      contactId: 'c1',
      firstName: 'Ari',
      lastName: 'Jones',
      preferredName: '',
      email: 'ari@example.com',
      contactTypeId: 'ct-2',
      permissionType: 'edit',
      phoneNumber: '0499',
      phoneTypeId: 2,
    });

    expect(rpc).toHaveBeenCalledWith(
      'app_pace_contact_update',
      expect.objectContaining({
        p_contact_id: 'c1',
        p_first_name: 'Ari',
        p_last_name: 'Jones',
        p_email: 'ari@example.com',
        p_contact_type_id: 'ct-2',
        p_permission_type: 'edit',
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['additionalContacts', 'v1'] });
  });

  it('sends undefined email when update email is blank', async () => {
    rpc.mockResolvedValue({
      data: [{ id: 'c1' }],
      error: null,
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await result.current.updateContact.mutateAsync({
      contactId: 'c1',
      firstName: 'Ari',
      lastName: 'Jones',
      preferredName: '',
      email: '   ',
      contactTypeId: 'ct-2',
      permissionType: 'edit',
      phoneNumber: '',
      phoneTypeId: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      'app_pace_contact_update',
      expect.objectContaining({
        p_contact_id: 'c1',
        p_email: undefined,
      })
    );
  });

  it('throws when RPC returns error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'nope' },
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(result.current.deleteContact.mutateAsync('c1')).rejects.toThrow('nope');
  });

  it('throws when deleted flag is false', async () => {
    rpc.mockResolvedValue({
      data: [{ deleted: false, id: 'c1' }],
      error: null,
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(result.current.deleteContact.mutateAsync('c1')).rejects.toThrow(
      /could not be deleted/i
    );
  });

  it('throws when create RPC returns no rows', async () => {
    rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(
      result.current.createContact.mutateAsync({
        memberId: 'm1',
        firstName: 'Ari',
        lastName: 'Jones',
        preferredName: '',
        email: '',
        contactTypeId: 'ct-2',
        permissionType: 'edit',
        phoneNumber: '',
        phoneTypeId: null,
      })
    ).rejects.toThrow(/could not be created/i);
  });

  it('throws when update RPC returns no rows', async () => {
    rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useContactOperations(), { wrapper });

    await expect(
      result.current.updateContact.mutateAsync({
        contactId: 'c1',
        firstName: 'Ari',
        lastName: 'Jones',
        preferredName: '',
        email: '',
        contactTypeId: 'ct-2',
        permissionType: 'edit',
        phoneNumber: '',
        phoneTypeId: null,
      })
    ).rejects.toThrow(/could not be updated/i);
  });
});
