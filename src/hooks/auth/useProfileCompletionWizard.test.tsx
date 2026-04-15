import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useProfileCompletionWizard } from '@/hooks/auth/useProfileCompletionWizard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@solvera/pace-core/components', async () => {
  const actual = await vi.importActual<typeof import('@solvera/pace-core/components')>(
    '@solvera/pace-core/components'
  );
  return {
    ...actual,
    toast: vi.fn(),
  };
});

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: { id: 'org-1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/shared/hooks/useReferenceData', () => ({
  useReferenceData: () => ({
    data: { phoneTypes: [], membershipTypes: [], genderTypes: [], pronounTypes: [] },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/contacts/usePhoneNumbers', () => ({
  usePhoneNumbers: () => ({
    data: [{ phone_number: '0400 000 000' }],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/hooks/shared/useAddressData', () => ({
  useAddressData: () => ({
    isLoading: false,
    isError: false,
    error: null,
    addressData: {
      residential: { full_address: '1 Test St', place_id: 'place' },
      isUnresolved: false,
    },
  }),
}));

vi.mock('@/integrations/google-maps/loader', () => ({
  loadGoogleMapsWithPlaces: vi
    .fn()
    .mockResolvedValue({ ok: true, data: { status: 'skipped', reason: 'no_api_key' } }),
}));

vi.mock('@/shared/lib/utils/userUtils', () => {
  const personRow = {
    id: 'p1',
    user_id: 'user-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    middle_name: null,
    preferred_name: null,
    date_of_birth: null,
    address_id: 'addr-1',
    created_at: null,
    created_by: null,
    deleted_at: null,
    updated_at: null,
    updated_by: null,
  };
  return {
    fetchCurrentPersonMember: vi.fn(async () => ({
      ok: true as const,
      data: {
        person: personRow,
        member: null,
        usedReducedFieldFallback: false,
      },
    })),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/profile-complete?eventSlug=evt&formSlug=frm']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useProfileCompletionWizard', () => {
  it('navigates to dashboard when cancel is invoked', async () => {
    mockNavigate.mockClear();
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    result.current.cancel();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: false });
  });

  it('exposes event handoff slugs from the query string', async () => {
    const { result } = renderHook(() => useProfileCompletionWizard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isShellLoading).toBe(false);
    });

    expect(result.current.eventSlug).toBe('evt');
    expect(result.current.formSlug).toBe('frm');
    expect(result.current.completionPathPreview).toBe('/evt/frm?fromWizard=true');
  });
});
