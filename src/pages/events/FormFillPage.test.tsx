import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { err, ok } from '@solvera/pace-core/types';
import { FormFillPage } from '@/pages/events/FormFillPage';
import * as userUtils from '@/shared/lib/utils/userUtils';

const fetchSubmittedMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/fetchSubmittedRegistrationSnapshot', () => ({
  fetchSubmittedRegistrationSnapshot: (...args: unknown[]) => fetchSubmittedMock(...args),
}));

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const toastMock = vi.hoisted(() => vi.fn());
const submitAsync = vi.hoisted(() => vi.fn());
const lastSubmissionInput = vi.hoisted(() => ({
  current: null as {
    actingUserId: string;
    applicantPersonId: string;
    organisationId: string;
    eventId: string;
    formId: string;
    fieldRows: unknown[];
  } | null,
}));

vi.mock('@solvera/pace-core/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/hooks')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/hooks/events/useApplicationSubmission', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/events/useApplicationSubmission')>();
  return {
    ...actual,
    useApplicationSubmission: (
      input: {
        actingUserId: string;
        applicantPersonId: string;
        organisationId: string;
        eventId: string;
        formId: string;
        fieldRows: unknown[];
      } | null
    ) => {
      lastSubmissionInput.current = input;
      return {
        submit: submitAsync,
        isSubmitting: false,
        resetSubmission: vi.fn(),
        lastResult: undefined,
      };
    },
  };
});

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
    <MemoryRouter initialEntries={['/camp/reg']}>
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
    mockNavigate.mockClear();
    toastMock.mockClear();
    lastSubmissionInput.current = null;
    submitAsync.mockImplementation(async () =>
      ok({ applicationId: 'app-x', responseId: 'resp-x' })
    );
    authState.isAuthenticated = true;
    authState.user = { id: 'user-1' };
    orgState.selectedOrganisation = { id: 'org-1' };
    proxyState.isProxyActive = false;
    proxyState.isValidating = false;
    proxyState.targetPersonId = null;
    proxyState.targetMemberId = null;

    fetchSubmittedMock.mockResolvedValue(ok(null));

    useFormBySlugMock.mockReturnValue({
      data: {
        event: { event_name: 'Camp event', event_id: 'ev1' },
        form: {
          id: 'form-1',
          title: 'Registration',
          name: 'Registration',
          description: null,
          workflow_type: 'base_registration',
        },
        fieldRows: [],
        confirmationKeys: [],
      },
      isLoading: false,
      error: null,
      notFound: false,
      reservedSlug: false,
    });

    useDraftMock.mockReturnValue({
      applicationId: null,
      responseId: 'r1',
      valueByFieldId: {},
      isHydrating: false,
      hydrateError: null,
      scheduleSaveDraft: vi.fn(),
      saveDraftNow: vi.fn().mockResolvedValue(undefined),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });

    useFormFieldDataMock.mockReturnValue({
      fieldMetas: [],
      fieldDefaults: {},
      prefillWarning: null,
      fetchErrorMessage: null,
      isLoading: false,
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
      saveDraftNow: vi.fn().mockResolvedValue(undefined),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });
    renderPage();
    expect(await screen.findByText(/resuming your application/i)).toBeInTheDocument();
  });

  it('shows read-only submitted journey with progress deep link when a snapshot exists', async () => {
    const applicationId = '11111111-1111-4111-a111-111111111111';
    fetchSubmittedMock.mockResolvedValue(
      ok({
        applicationId,
        responseId: 'resp-submitted',
        valueByFieldId: { 'field-1': 'prior answer' },
      })
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/this application was submitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    const progressBtn = screen.getByRole('button', { name: /view application progress/i });
    expect(progressBtn).toBeInTheDocument();
    await user.click(progressBtn);
    expect(mockNavigate).toHaveBeenCalledWith(`/camp/applications/${applicationId}`);
  });

  it('hides progress deep link when proxy assist is active on a submitted snapshot', async () => {
    const applicationId = '11111111-1111-4111-a111-111111111111';
    proxyState.isProxyActive = true;
    proxyState.targetPersonId = 'p-proxy';
    proxyState.targetMemberId = 'm-proxy';
    fetchSubmittedMock.mockResolvedValue(
      ok({
        applicationId,
        responseId: 'resp-submitted',
        valueByFieldId: { 'field-1': 'prior answer' },
      })
    );
    useFormFillTargetPersonMock.mockReturnValue({
      data: { first_name: 'Proxy', last_name: 'User', email: 'p@example.com' },
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(await screen.findByText(/this application was submitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view application progress/i })).not.toBeInTheDocument();
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

  it('shows field data fetch error with back navigation', async () => {
    useFormFieldDataMock.mockReturnValue({
      fieldMetas: [],
      fieldDefaults: {},
      prefillWarning: null,
      fetchErrorMessage: 'Could not load field defaults.',
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage();
    expect(await screen.findByText(/field data/i)).toBeInTheDocument();
    expect(screen.getByText(/could not load field defaults/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to event/i })).toBeInTheDocument();
  });

  it('shows read-only submitted state when draft hydrate indicates already submitted', async () => {
    useDraftMock.mockReturnValue({
      applicationId: null,
      responseId: null,
      valueByFieldId: {},
      isHydrating: false,
      hydrateError:
        'You have already submitted an application for this event. Use Manage on the dashboard to view your application progress.',
      scheduleSaveDraft: vi.fn(),
      saveDraftNow: vi.fn().mockResolvedValue(undefined),
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });
    renderPage();
    expect(await screen.findByText(/^Submitted$/i)).toBeInTheDocument();
    expect(screen.getByText(/this application was submitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('shows success toast and navigates home after submit succeeds', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(submitAsync).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Application submitted',
        description: expect.stringMatching(/submitted successfully/i),
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('uses delegated copy in success toast when proxy is active', async () => {
    proxyState.isProxyActive = true;
    proxyState.targetPersonId = 'p-proxy';
    proxyState.targetMemberId = 'm-proxy';
    useFormFillTargetPersonMock.mockReturnValue({
      data: { first_name: 'Proxy', last_name: 'User', email: 'p@example.com' },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Application submitted',
        description: expect.stringMatching(/member you are assisting/i),
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('passes proxy target person id into submission context', async () => {
    proxyState.isProxyActive = true;
    proxyState.targetPersonId = 'p-proxy';
    proxyState.targetMemberId = 'm-proxy';
    useFormFillTargetPersonMock.mockReturnValue({
      data: { first_name: 'Proxy', last_name: 'User', email: 'p@example.com' },
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    expect(lastSubmissionInput.current?.applicantPersonId).toBe('p-proxy');
    expect(lastSubmissionInput.current?.actingUserId).toBe('user-1');
  });

  it('does not navigate home and shows error when submit returns PARTIAL_PERSISTENCE', async () => {
    submitAsync.mockResolvedValue(
      err({
        code: 'PARTIAL_PERSISTENCE',
        message: 'Your application was created but the form response could not be finalised.',
      })
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: expect.stringMatching(/submission incomplete/i),
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/could not be finalised/i)
    ).toBeInTheDocument();
  });

  it('does not navigate home when submit returns APPLICATION_RPC_FAILED', async () => {
    submitAsync.mockResolvedValue(
      err({
        code: 'APPLICATION_RPC_FAILED',
        message: 'Application RPC rejected.',
      })
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: expect.stringMatching(/submission failed/i),
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(await screen.findByText(/application rpc rejected/i)).toBeInTheDocument();
  });

  it('does not navigate home when submit returns DUPLICATE_SUBMIT_PREVENTED', async () => {
    submitAsync.mockResolvedValue(
      err({
        code: 'DUPLICATE_SUBMIT_PREVENTED',
        message: 'You already submitted.',
      })
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: expect.stringMatching(/already submitted/i),
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(await screen.findByText(/you already submitted/i)).toBeInTheDocument();
  });

  it('does not submit when flushing draft fails', async () => {
    const saveDraftNow = vi.fn().mockRejectedValue(new Error('Network dropped during flush'));
    useDraftMock.mockReturnValue({
      applicationId: null,
      responseId: 'r1',
      valueByFieldId: {},
      isHydrating: false,
      hydrateError: null,
      scheduleSaveDraft: vi.fn(),
      saveDraftNow,
      isSavingDraft: false,
      saveDraftError: null,
      refetchBundle: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Camp event' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(saveDraftNow).toHaveBeenCalled();
    expect(submitAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'Draft save',
      })
    );
    expect(await screen.findByText(/network dropped during flush/i)).toBeInTheDocument();
  });
});