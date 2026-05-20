import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createOrganisationId } from '@solvera/pace-core/types';
import { useMemberRequestFlow } from '@/hooks/memberships/useMemberRequestFlow';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'u1' },
    supabase: { rpc: vi.fn() },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({ selectedOrganisation: { id: 'org-ctx' } }),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}),
}));

vi.mock('@/shared/lib/utils/userUtils', () => ({
  fetchCurrentPersonMember: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      person: {
        id: 'p1',
        date_of_birth: '1990-01-01',
        first_name: 'A',
        last_name: 'B',
        email: 'a@b.c',
      },
      member: null,
      usedReducedFieldFallback: false,
    },
  }),
}));

const membershipTypesMock = vi.hoisted(() => [
  {
    id: 1,
    name: 'Adult',
    minAge: null,
    maxAge: null,
    organisationId: 'org-target',
  },
]);

const filterByAgeMock = vi.hoisted(() => vi.fn(() => membershipTypesMock));

vi.mock('@/lib/fetchOrgMembershipTypes', () => ({
  fetchOrgMembershipTypes: vi.fn().mockResolvedValue({ ok: true, data: membershipTypesMock }),
  filterMembershipTypesByAge: filterByAgeMock,
}));

const submitFlowMock = vi.hoisted(() => vi.fn());
const pendingMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/submitMemberRequestFlow', () => ({
  submitMemberRequestFlow: (...args: unknown[]) => submitFlowMock(...args),
  loadPendingRequestsForGuard: (...args: unknown[]) => pendingMock(...args),
}));

vi.mock('@/lib/fetchOrgSignupForm', () => ({
  fetchOrgSignupForm: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

vi.mock('@/lib/searchJoinableOrganisations', () => ({
  searchJoinableOrganisations: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMemberRequestFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filterByAgeMock.mockImplementation(() => membershipTypesMock);
    pendingMock.mockResolvedValue({ ok: true, data: [] });
    submitFlowMock.mockResolvedValue({
      ok: true,
      data: {
        submittedOrgName: 'Target Org',
        listItem: {
          memberId: 'mem-1',
          organisationId: createOrganisationId('org-target'),
          organisationName: 'Target Org',
          membershipStatus: 'Provisional',
          membershipTypeId: 1,
          membershipTypeName: 'Adult',
          membershipNumber: null,
          requestId: 'req-1',
          requestStatus: 'pending',
          requestSubmittedAt: '2026-05-19T00:00:00.000Z',
          displayKind: 'awaiting_approval',
          displayLabel: 'Awaiting approval',
          showApplyAgain: false,
        },
      },
    });
  });

  it('starts at idle and opens request_type on startFlow', () => {
    const onSubmitted = vi.fn();
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted,
        }),
      { wrapper }
    );

    expect(result.current.flowStep).toBe('idle');
    act(() => {
      result.current.startFlow();
    });
    expect(result.current.flowStep).toBe('request_type');
  });

  it('advances from org_search when org is selected', async () => {
    const onSubmitted = vi.fn();
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted,
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.selectOrg({
        id: createOrganisationId('org-target'),
        name: 'Target',
        displayName: 'Target Org',
      });
    });

    await waitFor(() => {
      expect(result.current.selectedOrg?.id).toBe('org-target');
    });

    act(() => {
      result.current.goNext();
    });
    expect(['membership_type', 'org_form']).toContain(result.current.flowStep);
  });

  it('submits request and shows confirmation', async () => {
    const onSubmitted = vi.fn();
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted,
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.selectOrg({
        id: createOrganisationId('org-target'),
        name: 'Target',
        displayName: 'Target Org',
      });
      result.current.setSelectedMembershipTypeId(1);
    });

    await waitFor(() => {
      expect(result.current.selectedOrg).not.toBeNull();
    });

    act(() => {
      result.current.goNext();
      result.current.goNext();
    });

    await act(async () => {
      await result.current.submitRequest({});
    });

    await waitFor(() => {
      expect(result.current.flowStep).toBe('confirmation');
    });
    expect(onSubmitted).toHaveBeenCalled();
    expect(submitFlowMock).toHaveBeenCalled();
  });

  it('sets pre-submit error when submit is blocked', async () => {
    submitFlowMock.mockResolvedValue({
      ok: false,
      error: { code: 'PROFILE_INCOMPLETE', message: 'Complete profile' },
    });
    const onSubmitted = vi.fn();
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted,
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow({
        prefilledOrgId: 'org-target',
        prefilledOrgName: 'Target Org',
      });
      result.current.setSelectedMembershipTypeId(1);
    });

    await waitFor(() => {
      expect(result.current.selectedOrg).not.toBeNull();
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submitRequest({});
    });

    expect(result.current.preSubmitError).toMatch(/member profile/i);
    expect(result.current.preSubmitCode).toBe('PROFILE_INCOMPLETE');
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('routes to membership_type when no age-eligible types', async () => {
    filterByAgeMock.mockReturnValue([]);
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.selectOrg({
        id: createOrganisationId('org-target'),
        name: 'Target',
        displayName: 'Target Org',
      });
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());

    act(() => {
      result.current.goNext();
      result.current.goNext();
    });

    expect(result.current.flowStep).toBe('membership_type');
  });

  it('sets age pre-submit code when continuing with no eligible types', async () => {
    filterByAgeMock.mockReturnValue([]);
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.selectOrg({
        id: createOrganisationId('org-target'),
        name: 'Target',
        displayName: 'Target Org',
      });
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());

    act(() => {
      result.current.goNext();
      result.current.goNext();
    });
    expect(result.current.flowStep).toBe('membership_type');

    act(() => {
      result.current.goNext();
    });

    expect(result.current.preSubmitCode).toBe('AGE_INELIGIBLE');
    expect(result.current.flowStep).toBe('membership_type');
  });

  it('sets duplicate pre-submit error from submit flow', async () => {
    submitFlowMock.mockResolvedValue({
      ok: false,
      error: { code: 'DUPLICATE_REQUEST', message: 'Duplicate request' },
    });
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow({
        prefilledOrgId: 'org-target',
        prefilledOrgName: 'Target Org',
      });
      result.current.setSelectedMembershipTypeId(1);
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.submitRequest({});
    });

    expect(result.current.preSubmitCode).toBe('DUPLICATE_REQUEST');
    expect(result.current.preSubmitError).toMatch(/pending/i);
  });

  it('sets age ineligible pre-submit error from submit flow', async () => {
    submitFlowMock.mockResolvedValue({
      ok: false,
      error: { code: 'AGE_INELIGIBLE', message: 'Age ineligible' },
    });
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow({
        prefilledOrgId: 'org-target',
        prefilledOrgName: 'Target Org',
      });
      result.current.setSelectedMembershipTypeId(1);
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.submitRequest({});
    });

    expect(result.current.preSubmitCode).toBe('AGE_INELIGIBLE');
  });

  it('cancels flow and clears confirmation', () => {
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.cancelFlow();
    });
    expect(result.current.flowStep).toBe('idle');
  });

  it('surfaces RPC submit errors', async () => {
    submitFlowMock.mockResolvedValue({
      ok: false,
      error: { code: 'MEMBER_REQUEST_RPC_FAILED', message: 'Server error' },
    });
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow({
        prefilledOrgId: 'org-target',
        prefilledOrgName: 'Target Org',
      });
      result.current.setSelectedMembershipTypeId(1);
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submitRequest({});
    });

    expect(result.current.submitError).toMatch(/server error/i);
  });

  it('walks transfer flow through source org selection', async () => {
    const onSubmitted = vi.fn();
    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [
            {
              memberId: 'm1',
              organisationId: createOrganisationId('org-src'),
              organisationName: 'Source Org',
              membershipStatus: 'Active',
              membershipTypeId: 1,
              membershipTypeName: 'A',
              membershipNumber: '1',
              requestId: null,
              requestStatus: null,
              requestSubmittedAt: null,
              displayKind: 'active',
              displayLabel: 'Active',
              showApplyAgain: false,
            },
          ],
          onSubmitted,
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
      result.current.setRequestType('transfer');
    });
    act(() => {
      result.current.goNext();
    });
    expect(result.current.flowStep).toBe('org_search');

    act(() => {
      result.current.selectOrg({
        id: createOrganisationId('org-target'),
        name: 'Target',
        displayName: 'Target Org',
      });
    });

    await waitFor(() => expect(result.current.selectedOrg).not.toBeNull());

    act(() => {
      result.current.goNext();
    });
    expect(result.current.flowStep).toBe('source_org');

    act(() => {
      result.current.setSourceOrgId('org-src');
    });
    act(() => {
      result.current.goNext();
    });
    expect(['membership_type', 'org_form']).toContain(result.current.flowStep);
  });

  it('surfaces org search RPC errors inline', async () => {
    const { searchJoinableOrganisations } = await import('@/lib/searchJoinableOrganisations');
    vi.mocked(searchJoinableOrganisations).mockResolvedValue({
      ok: false,
      error: { code: 'JOINABLE_ORG_SEARCH', message: 'Search unavailable' },
    });

    const { result } = renderHook(
      () =>
        useMemberRequestFlow({
          existingMemberships: [],
          onSubmitted: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.startFlow();
    });
    act(() => {
      result.current.goNext();
    });
    expect(result.current.flowStep).toBe('org_search');

    act(() => {
      result.current.setOrgSearchQuery('acme');
    });

    await waitFor(() => {
      expect(result.current.orgSearchError).toMatch(/search unavailable/i);
    });
    expect(result.current.orgSearchResults).toEqual([]);
  });
});
