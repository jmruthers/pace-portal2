import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { err, ok } from '@solvera/pace-core/types';
import { FormFillPage } from '@/pages/events/FormFillPage';
import * as userUtils from '@/shared/lib/utils/userUtils';

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AccessDenied: () => <p>Access denied</p>,
}));

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { id: 'user-1' } as { id: string } | null,
}));

const orgState = vi.hoisted(() => ({
  selectedOrganisation: { id: 'org-1' } as { id: string } | null,
  organisations: [{ id: 'org-1' }],
}));

const proxyState = vi.hoisted(() => ({
  isProxyActive: false,
  isValidating: false,
  targetPersonId: null as string | null,
  targetMemberId: null as string | null,
}));

const useFormBySlugMock = vi.hoisted(() => vi.fn());
const useDraftMock = vi.hoisted(() => vi.fn());
const useFormFillTargetPersonMock = vi.hoisted(() => vi.fn());
const useFormFieldDataMock = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
  }),
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useOrganisationsContextOptional: () => ({
    selectedOrganisation: orgState.selectedOrganisation,
    organisations: orgState.organisations,
  }),
}));

vi.mock('@/hooks/events/useFormFillTargetPerson', () => ({
  useFormFillTargetPerson: (...args: unknown[]) => useFormFillTargetPersonMock(...args),
}));

vi.mock('@/hooks/events/useFormBySlug', () => ({
  useFormBySlug: (...args: unknown[]) => useFormBySlugMock(...args),
}));

vi.mock('@/hooks/events/useFormFieldData', () => ({
  useFormFieldData: (...args: unknown[]) => useFormFieldDataMock(...args),
}));

vi.mock('@/hooks/events/useDraftApplication', () => ({
  useDraftApplication: (...args: unknown[]) => useDraftMock(...args),
}));

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => ({
    isProxyActive: proxyState.isProxyActive,
    isValidating: proxyState.isValidating,
    validationError: null,
    targetPersonId: proxyState.targetPersonId,
    targetMemberId: proxyState.targetMemberId,
  }),
}));

vi.mock('@/shared/lib/utils/userUtils', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/utils/userUtils')>(
    '@/shared/lib/utils/userUtils'
  );
  return {
    ...actual,
    fetchCurrentPersonMember: vi.fn(),
  };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return render(
    <MemoryRouter>
      <FormFillPage eventSlug="camp" formSlug="reg" />
    </MemoryRouter>,
    { wrapper: Provider }
  );
}

const minimalPerson = {
  id: 'p1',
  user_id: 'user-1',
  first_name: 'Self',
  last_name: 'Member',
  email: 'self@example.com',
  middle_name: null,
  preferred_name: null,
  date_of_birth: null,
  gender_id: null,
  pronoun_id: null,
  residential_address_id: null,
  postal_address_id: null,
  created_at: null,
  created_by: null,
  deleted_at: null,
  updated_at: null,
  updated_by: null,
};

const minimalMember = {
  id: 'm1',
  person_id: 'p1',
  organisation_id: 'org-1',
  created_at: null,
  updated_at: null,
};

describe('FormFillPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
    authState.user = { id: 'user-1' };
    orgState.selectedOrganisation = { id: 'org-1' };
    proxyState.isProxyActive = false;
    proxyState.isValidating = false;
    proxyState.targetPersonId = null;
    proxyState.targetMemberId = null;

    useFormBySlugMock.mockReturnValue({
      data: {
        event: { event_name: 'Camp event', event_id: 'ev1' },
        form: { id: 'form-1', title: 'Registration', name: 'Registration', description: null },
        fieldRows: [],
        confirmationKeys: [],
      },
      isLoading: false,
      error: null,
      notFound: false,
      reservedSlug: false,
    });

    useDraftMock.mockReturnValue({
      applicationId: 'app-1',
      responseId: 'r1',
      valueByFieldId: {},
      isHydrating: false,
      hydrateError: null,
      scheduleSaveDraft: vi.fn(),
      saveDraftNow: vi.fn(),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });

    useFormFieldDataMock.mockReturnValue({
      fieldMetas: [],
      fieldDefaults: {},
      prefillWarning: null,
      fieldLoadError: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(userUtils.fetchCurrentPersonMember).mockResolvedValue(
      ok({
        person: minimalPerson as never,
        member: minimalMember as never,
        usedReducedFieldFallback: false,
      })
    );

    useFormFillTargetPersonMock.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
  });

  it('shows sign-in handoff copy when unauthenticated', () => {
    authState.isAuthenticated = false;
    authState.user = null;
    renderPage();
    expect(screen.getByText(/redirecting to sign in/i)).toBeInTheDocument();
  });

  it('requires organisation context', () => {
    orgState.selectedOrganisation = null;
    renderPage();
    expect(screen.getByText(/organisation required/i)).toBeInTheDocument();
  });

  it('prompts profile setup when the signed-in user has no person profile (non-proxy)', async () => {
    vi.mocked(userUtils.fetchCurrentPersonMember).mockResolvedValue(
      err({ code: userUtils.NO_PERSON_PROFILE_ERROR_CODE, message: 'No profile' })
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: /profile required/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start setup/i })).toBeInTheDocument();
  });

  it('skips profile gate while proxy is active', async () => {
    proxyState.isProxyActive = true;
    proxyState.targetPersonId = 'p-proxy';
    proxyState.targetMemberId = 'm-proxy';
    vi.mocked(userUtils.fetchCurrentPersonMember).mockResolvedValue(
      err({ code: userUtils.NO_PERSON_PROFILE_ERROR_CODE, message: 'No profile' })
    );
    useFormFillTargetPersonMock.mockReturnValue({
      data: { first_name: 'Proxy', last_name: 'User', email: 'p@example.com' },
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
  });

  it('shows draft resume banner when saved answers exist', async () => {
    useDraftMock.mockReturnValue({
      applicationId: 'app-1',
      responseId: 'r1',
      valueByFieldId: { 'field-1': 'saved answer' },
      isHydrating: false,
      hydrateError: null,
      scheduleSaveDraft: vi.fn(),
      saveDraftNow: vi.fn(),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });
    renderPage();
    expect(await screen.findByText(/resuming your application/i)).toBeInTheDocument();
  });

  it('shows form unavailable when form load fails', async () => {
    useFormBySlugMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Wrong access mode'),
      notFound: false,
      reservedSlug: false,
    });
    renderPage();
    expect(await screen.findByText(/form unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/wrong access mode/i)).toBeInTheDocument();
  });

  it('shows field data error and back to event', async () => {
    useFormFieldDataMock.mockReturnValue({
      fieldMetas: [],
      fieldDefaults: {},
      prefillWarning: null,
      fieldLoadError: 'Could not load defaults.',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(await screen.findByText(/field data/i)).toBeInTheDocument();
    expect(screen.getByText(/could not load defaults/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to event/i })).toBeInTheDocument();
  });

  it('shows draft hydrate error from FormRenderer', async () => {
    useDraftMock.mockReturnValue({
      applicationId: null,
      responseId: null,
      valueByFieldId: {},
      isHydrating: false,
      hydrateError: 'An application for this event already exists and is not a draft.',
      scheduleSaveDraft: vi.fn(),
      saveDraftNow: vi.fn(),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });
    renderPage();
    expect(
      await screen.findByText(/an application for this event already exists/i)
    ).toBeInTheDocument();
  });
});