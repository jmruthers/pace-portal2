import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '@solvera/pace-core/components';
import { AdditionalContactsPage } from '@/pages/AdditionalContactsPage';
import type { GroupedAdditionalContact } from '@/utils/contacts/groupAdditionalContactRows';

const dataMock = vi.fn();
const deleteMutateAsync = vi.fn();
const deleteReset = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@/hooks/contacts/useAdditionalContactsData', () => ({
  useAdditionalContactsData: () => dataMock(),
}));

vi.mock('@/hooks/contacts/useContactOperations', () => ({
  useContactOperations: () => ({
    createContact: {
      mutateAsync: createMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    },
    deleteContact: {
      mutateAsync: deleteMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      reset: deleteReset,
    },
    updateContact: {
      mutateAsync: updateMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    },
  }),
}));

vi.mock('@/components/contacts/ContactForm', () => ({
  ContactForm: ({
    mode,
    initialContact,
    onCancel,
  }: {
    mode: 'create' | 'edit';
    initialContact: GroupedAdditionalContact | null;
    onCancel: () => void;
  }) => (
    <section aria-label="Mock contact form">
      <p>{mode === 'create' ? 'Create contact form' : `Edit contact form: ${initialContact?.first_name ?? ''}`}</p>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel form
      </Button>
    </section>
  ),
}));

vi.mock('@/shared/components/ProxyModeBanner', () => ({
  ProxyModeBanner: () => <div>Proxy banner</div>,
}));

const proxyModeImpl = vi.hoisted(() =>
  vi.fn(() => ({
    setProxyTargetMemberId: vi.fn(),
    validationError: null as string | null,
  }))
);

vi.mock('@/shared/hooks/useProxyMode', () => ({
  useProxyMode: () => proxyModeImpl(),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({
    children,
    fallback,
  }: {
    children: ReactNode;
    fallback?: ReactNode;
  }) => {
    if (guardPhase === 'denied') return fallback;
    return <>{children}</>;
  },
  AccessDenied: () => <p>Access denied</p>,
}));

let guardPhase: 'ok' | 'denied' = 'ok';

function renderPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AdditionalContactsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdditionalContactsPage', () => {
  beforeEach(() => {
    guardPhase = 'ok';
    deleteMutateAsync.mockReset();
    createMutateAsync.mockReset();
    updateMutateAsync.mockReset();
    deleteReset.mockReset();
    proxyModeImpl.mockImplementation(() => ({
      setProxyTargetMemberId: vi.fn(),
      validationError: null,
    }));
    dataMock.mockReturnValue({
      contacts: [],
      mode: 'self',
      isProxyResolving: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: 'org-1',
    });
  });

  it('renders heading', () => {
    renderPage('/additional-contacts');
    expect(screen.getByRole('heading', { name: /additional contacts/i, level: 1 })).toBeInTheDocument();
  });

  it('shows empty state with add-contact CTA', () => {
    renderPage('/additional-contacts');
    expect(screen.getByText(/no additional contacts yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
  });

  it('opens create contact form when add contact is clicked', async () => {
    const user = userEvent.setup();
    renderPage('/additional-contacts');

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    expect(screen.getByText(/create contact form/i)).toBeInTheDocument();
  });

  it('returns to list from create contact form cancel', async () => {
    const user = userEvent.setup();
    renderPage('/additional-contacts');

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    await user.click(screen.getByRole('button', { name: /cancel form/i }));

    expect(screen.getByText(/no additional contacts yet/i)).toBeInTheDocument();
  });

  it('shows contacts list with delete when data is present', () => {
    dataMock.mockReturnValue({
      contacts: [
        {
          contact_id: 'c1',
          contact_person_id: 'p1',
          contact_type_id: 1,
          contact_type_name: 'Emergency',
          email: 'a@b.c',
          first_name: 'Sam',
          last_name: 'Lee',
          member_id: 'm1',
          organisation_id: 'org-1',
          permission_type: 'view',
          phones: [{ phone_number: '0400', phone_type: 'Mobile' }],
        },
      ],
      mode: 'self',
      isProxyResolving: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: 'org-1',
    });

    renderPage('/additional-contacts');

    expect(screen.getByText(/Sam Lee/)).toBeInTheDocument();
    expect(screen.getByText(/Emergency/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('opens edit contact form from list edit action', async () => {
    dataMock.mockReturnValue({
      contacts: [
        {
          contact_id: 'c1',
          contact_person_id: 'p1',
          contact_type_id: 1,
          contact_type_name: 'Emergency',
          email: 'a@b.c',
          first_name: 'Sam',
          last_name: 'Lee',
          member_id: 'm1',
          organisation_id: 'org-1',
          permission_type: 'view',
          phones: [{ phone_number: '0400', phone_type: 'Mobile' }],
        },
      ],
      mode: 'self',
      isProxyResolving: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: 'org-1',
    });
    const user = userEvent.setup();
    renderPage('/additional-contacts');

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.getByText(/edit contact form: Sam/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    dataMock.mockReturnValue({
      contacts: [],
      mode: 'self',
      isProxyResolving: false,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: 'org-1',
    });

    renderPage('/additional-contacts');

    expect(screen.getByLabelText(/contacts loading/i)).toBeInTheDocument();
  });

  it('shows proxy resolving spinner', () => {
    dataMock.mockReturnValue({
      contacts: [],
      mode: 'self',
      isProxyResolving: true,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: 'org-1',
    });

    renderPage('/additional-contacts?targetMemberId=m1');

    expect(screen.getByLabelText(/delegated contacts loading/i)).toBeInTheDocument();
  });

  it('shows load error', () => {
    dataMock.mockReturnValue({
      contacts: [],
      mode: 'self',
      isProxyResolving: false,
      isLoading: false,
      isError: true,
      error: new Error('rpc failed'),
      refetch: vi.fn(),
      organisationId: 'org-1',
    });

    renderPage('/additional-contacts');

    expect(screen.getByText(/rpc failed/i)).toBeInTheDocument();
  });

  it('shows proxy validation error', () => {
    proxyModeImpl.mockImplementation(() => ({
      setProxyTargetMemberId: vi.fn(),
      validationError: 'Proxy access was denied.',
    }));

    renderPage('/additional-contacts');

    expect(screen.getByText(/proxy access was denied/i)).toBeInTheDocument();
  });

  it('shows organisation required when org missing', () => {
    dataMock.mockReturnValue({
      contacts: [],
      mode: 'self',
      isProxyResolving: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      organisationId: null,
    });

    renderPage('/additional-contacts');

    expect(screen.getByText(/organisation required/i)).toBeInTheDocument();
  });

  it('shows access denied when guard denies', () => {
    guardPhase = 'denied';
    renderPage('/additional-contacts');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('shows proxy banner when targetMemberId is in URL', () => {
    renderPage('/additional-contacts?targetMemberId=m1');
    expect(screen.getByText(/proxy banner/i)).toBeInTheDocument();
  });
});
