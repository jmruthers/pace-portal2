import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotoUploadDialog } from '@/components/member-profile/PhotoUploadDialog';

type FileUploadMockProps = {
  onUploadError?: (error: unknown) => void;
  onUploadSuccess?: (result: { file_reference: { id: string }; file_url: string }) => void;
};

vi.mock('@solvera/pace-core/utils', () => ({
  NormalizeSupabaseError: (error: unknown, fallback: string) => ({
    message: error instanceof Error ? error.message : fallback,
  }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  clearFileDisplayCache: vi.fn(),
}));

const { MockPaceButton } = vi.hoisted(() => {
  function MockPaceButton({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) {
    return (
      <div role="button" tabIndex={0} onClick={onClick} onKeyDown={() => undefined}>
        {children}
      </div>
    );
  }
  return { MockPaceButton };
});

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Button: MockPaceButton,
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <section data-testid="dialog">{children}</section> : null,
  DialogPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  FileUpload: ({ onUploadError, onUploadSuccess }: FileUploadMockProps) => (
    <div>
      <MockPaceButton onClick={() => onUploadError?.(new Error('Upload failed from test'))}>
        Trigger upload error
      </MockPaceButton>
      <MockPaceButton
        onClick={() =>
          onUploadSuccess?.({
            file_reference: { id: 'ref-new' },
            file_url: 'https://example.com/photo.jpg',
          })
        }
      >
        Trigger upload success
      </MockPaceButton>
    </div>
  ),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useStorageCapableClient: () => ({}),
}));

vi.mock('@/components/member-profile/PhotoGuidelines', () => ({
  PhotoGuidelines: () => <p>Photo guidance</p>,
}));

describe('PhotoUploadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(overrides?: Partial<ComponentProps<typeof PhotoUploadDialog>>) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <PhotoUploadDialog
          open
          onOpenChange={onOpenChange}
          personId="person-1"
          organisationId="org-1"
          appId="app-1"
          {...overrides}
        />
      </QueryClientProvider>
    );

    return { onOpenChange };
  }

  it('shows unavailable message when organisation context is missing', () => {
    renderDialog({ organisationId: null });

    expect(screen.getByText(/upload unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/select an organisation/i)).toBeInTheDocument();
  });

  it('shows upload error when file upload fails', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /trigger upload error/i }));

    expect(await screen.findByText(/upload failed from test/i)).toBeInTheDocument();
  });

  it('refetches profile photo query and closes dialog after upload success', async () => {
    const refetchSpy = vi.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.refetchQueries = refetchSpy;
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <PhotoUploadDialog
          open
          onOpenChange={onOpenChange}
          personId="person-1"
          organisationId="org-1"
          appId="app-1"
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger upload success/i }));

    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ['profilePhoto'] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when close button is clicked', () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders close action in dialog footer', () => {
    renderDialog();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});
