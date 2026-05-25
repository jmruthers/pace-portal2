import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as hubHook from '@/hooks/events/useEventHub';
import { EventHubPage } from '@/pages/events/EventHubPage';
import type { Database } from '@/types/pace-database';

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useSecureSupabase: () => null,
    PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AccessDenied: () => <p>Access denied</p>,
  };
});

vi.mock('@/hooks/events/useFileReferences', () => ({
  useFileReferences: vi.fn(() => ({
    refByEventId: new Map(),
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

const sampleRow = {
  event_id: 'ev1',
  event_name: 'Camp',
  event_code: 'camp',
  organisation_id: 'o1',
  event_date: '2026-06-01',
  event_days: null,
  participant_blurb: 'Bring a hat.',
  participant_admin_email: 'org@example.com',
  participant_website_url: 'https://camp.example',
  registration_scope: '',
  created_at: null,
  created_by: null,
  description: null,
  event_colours: null,
  event_email: null,
  event_venue: null,
  expected_participants: null,
  is_visible: true,
  public_readable: true,
  typical_unit_size: null,
  updated_at: null,
  updated_by: null,
  logo_id: null,
} as Database['public']['Tables']['core_events']['Row'];

type HubSpyState = Partial<ReturnType<typeof hubHook.useEventHub>>;

function renderUnderRoute(options: HubSpyState & { initialEntries?: string[] }) {
  const { initialEntries = ['/camp'], ...hubState } = options;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const data: hubHook.EventHubData | undefined =
    'data' in hubState
      ? hubState.data
      : ({
          event: sampleRow,
          applicationStatus: 'draft',
          eligibleFormLinks: [{ slug: 'reg', title: 'Registration', name: 'reg-name', sort_order: 0 }],
          inactiveFormWindow: false,
          needsProfileSetup: false,
        } satisfies hubHook.EventHubData);

  vi.spyOn(hubHook, 'useEventHub').mockReturnValue({
    data,
    isLoading: hubState.isLoading ?? false,
    errorMessage: hubState.errorMessage ?? null,
    rawData: hubState.rawData ?? undefined,
    refetch: hubState.refetch ?? vi.fn(),
    notFound: hubState.notFound ?? false,
    reservedSlug: hubState.reservedSlug ?? false,
  });

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <main data-testid="home-route">Dashboard</main>,
      },
      {
        path: '/login',
        element: <main data-testid="login-route">Login</main>,
      },
      {
        path: '/:eventSlug/itinerary',
        element: <article data-testid="itinerary-route">itinerary</article>,
      },
      {
        path: '/:eventSlug/:formSlug',
        element: <article data-testid="form-route">form</article>,
      },
      {
        path: '/:eventSlug',
        element: <EventHubPage />,
      },
    ],
    { initialEntries, initialIndex: 0 },
  );

  const view = render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { router, ...view };
}

describe('EventHubPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows View itinerary when participant is scoped and navigates to itinerary route', async () => {
    const user = userEvent.setup();
    const { router } = renderUnderRoute({
      data: {
        event: sampleRow,
        applicationStatus: 'approved',
        eligibleFormLinks: [],
        inactiveFormWindow: false,
        needsProfileSetup: false,
      },
      initialEntries: ['/camp'],
    });

    const itineraryButton = screen.getByRole('button', { name: /View itinerary/i });
    expect(itineraryButton).toBeInTheDocument();

    await user.click(itineraryButton);
    expect(router.state.location.pathname).toBe('/camp/itinerary');
  });

  it('does not show View itinerary when profile setup is required', () => {
    renderUnderRoute({
      data: {
        event: sampleRow,
        applicationStatus: 'approved',
        eligibleFormLinks: [],
        inactiveFormWindow: false,
        needsProfileSetup: true,
      },
    });
    expect(screen.queryByRole('button', { name: /View itinerary/i })).not.toBeInTheDocument();
  });

  it('renders event summary, application badge, inactive warning, and form links', async () => {
    const user = userEvent.setup();
    const { router } = renderUnderRoute({
      data: {
        event: sampleRow,
        applicationStatus: 'under_review',
        eligibleFormLinks: [{ slug: 'reg', title: '', name: 'Registration', sort_order: 1 }],
        inactiveFormWindow: true,
        needsProfileSetup: false,
      },
    });

    expect(screen.getByRole('heading', { name: /Camp/i })).toBeInTheDocument();
    expect(screen.getByText(/Bring a hat/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact organisers/i })).toHaveAttribute(
      'href',
      'mailto:org@example.com'
    );
    expect(screen.getByRole('link', { name: /camp\.example/i })).toBeInTheDocument();
    expect(screen.getByText('under_review')).toBeInTheDocument();
    expect(screen.getByText(/Forms not open right now/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Registration/i }));
    expect(router.state.location.pathname).toBe('/camp/reg');
  });

  it('shows profile-setup guidance instead of personalised application badge', () => {
    renderUnderRoute({
      data: {
        event: sampleRow,
        applicationStatus: null,
        eligibleFormLinks: [],
        inactiveFormWindow: false,
        needsProfileSetup: true,
      },
    });
    expect(screen.getByText(/Finish your profile/i)).toBeInTheDocument();
  });

  it('renders not-found when the hub hook reports a missing event', () => {
    renderUnderRoute({
      notFound: true,
      data: undefined,
      isLoading: false,
      errorMessage: null,
    });
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
  });

  it('renders not-found for reserved slugs', () => {
    renderUnderRoute({
      reservedSlug: true,
      data: undefined,
      initialEntries: ['/dashboard'],
    });
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
  });

  it('shows loading state while hub data is fetching', () => {
    renderUnderRoute({
      isLoading: true,
      data: undefined,
    });
    expect(screen.getByRole('status', { name: /Loading event hub/i })).toBeInTheDocument();
  });

  it('shows hub query error and navigates back to dashboard', async () => {
    const user = userEvent.setup();
    const { router } = renderUnderRoute({
      data: undefined,
      errorMessage: 'Could not load event.',
      notFound: false,
      reservedSlug: false,
      isLoading: false,
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Could not load event/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to dashboard/i }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });
});
