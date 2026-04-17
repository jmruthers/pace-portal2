import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddressOperations } from '@/hooks/member-profile/useAddressOperations';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'u1' } }),
}));

const insertSingle = vi.fn().mockResolvedValue({ data: { id: 'addr-new' }, error: null });
const updateEq = vi.fn().mockResolvedValue({ data: [{ id: 'addr-existing' }], error: null });
const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const insert = vi.fn(() => ({ select: () => ({ single: insertSingle }) }));
const update = vi.fn(() => ({ select: () => ({ eq: () => updateEq }) }));
const selectAddress = vi.fn(() => ({
  eq: vi.fn(() => ({
    maybeSingle: lookupMaybeSingle,
  })),
}));

const phoneInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({
    from: vi.fn((table: string) => {
      if (table === 'core_address') {
        return { insert, update, select: selectAddress };
      }
      if (table === 'core_phone') {
        return {
          insert: phoneInsert,
          update: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'ph1' }], error: null }) })),
          })),
        };
      }
      return {};
    }),
  }),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: (c: unknown) => c,
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useAddressOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertSingle.mockResolvedValue({ data: { id: 'addr-new' }, error: null });
    lookupMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('saveAddressesAndPhones resolves residential insert and phone insert', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useAddressOperations(), { wrapper: wrapper(qc) });

    await waitFor(() => {
      expect(result.current.saveAddressesAndPhones).toBeDefined();
    });

    const out = await result.current.saveAddressesAndPhones({
      organisationId: 'o1',
      residential: {
        line1: '1 St',
        locality: 'Sydney',
        countryCode: 'AU',
        placeId: 'place-1',
      },
      postal: null,
      postalSameAsResidential: true,
      residentialId: null,
      postalId: null,
      personId: 'p1',
      phones: [{ phone_number: '0400', phone_type_id: 1 }],
      existingPhoneIds: [],
    });

    expect(out.residentialAddressId).toBe('addr-new');
    expect(out.postalAddressId).toBe('addr-new');
    expect(phoneInsert).toHaveBeenCalled();
  });

  it('reuses existing address id when selected place_id already exists', async () => {
    lookupMaybeSingle.mockResolvedValue({ data: { id: 'addr-existing-by-place' }, error: null });
    const qc = new QueryClient();
    const { result } = renderHook(() => useAddressOperations(), { wrapper: wrapper(qc) });

    const out = await result.current.saveAddressesAndPhones({
      organisationId: 'o1',
      residential: {
        line1: '2 St',
        locality: 'Sydney',
        countryCode: 'AU',
        placeId: 'place-2',
      },
      postal: null,
      postalSameAsResidential: true,
      residentialId: null,
      postalId: null,
      personId: 'p1',
      phones: [{ phone_number: '0400', phone_type_id: 1 }],
      existingPhoneIds: [],
    });

    expect(out.residentialAddressId).toBe('addr-existing-by-place');
    expect(out.postalAddressId).toBe('addr-existing-by-place');
    expect(insert).not.toHaveBeenCalled();
  });
});
