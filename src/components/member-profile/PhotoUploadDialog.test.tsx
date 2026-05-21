import type { ComponentProps, ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <span role="button" tabIndex={0} onClick={onClick} onKeyDown={() => {}}>
      {children}
    </span>
  ),
  FileUpload: ({ onUploadError, onUploadSuccess }: FileUploadMockProps) => (
    <div>
      <span
        role="button"
        tabIndex={0}
        onClick={() => onUploadError?.(new Error('Upload failed from test'))}
        onKeyDown={() => {}}
      >
        Trigger upload error
      </span>
      <span
        role="button"
        tabIndex={0}
        onClick={() =>
          onUploadSuccess?.({
            file_reference: { id: 'ref-new' },
            file_url: 'https://example.com/photo.jpg',
          })
        }
        onKeyDown={() => {}}
      >
        Trigger upload success
      </span>
    </div>
  ),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useStorageCapableClient: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toSupabaseClientLike: () => ({}),
}));

vi.mock('@/components/member-profile/PhotoGuidelines', () => ({
  PhotoGuidelines: () => <p>Photo guidance</p>,
}));

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

describe('PhotoUploadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(overrides?: Partial<ComponentProps<typeof PhotoUploadDialog>>) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
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

    return { onOpenChange, invalidateSpy };
  }

  it('shows unavailable message when organisation context is missing', () => {
    renderDialog({ organisationId: null });

    expect(screen.getByText(/upload unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/select an organisation/i)).toBeInTheDocument();
    expect(screen.queryByText(/choose image/i)).not.toBeInTheDocument();
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

  it('closes when close button or backdrop is clicked', () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const dialog = document.querySelector('dialog');
    expect(dialog).not.toBeNull();
    if (dialog) {
      fireEvent.click(dialog);
    }
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});
