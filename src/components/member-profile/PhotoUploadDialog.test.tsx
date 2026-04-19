import type { ComponentProps, ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotoUploadDialog } from '@/components/member-profile/PhotoUploadDialog';

type FileUploadMockProps = {
  onUploadError?: (error: unknown) => void;
  onUploadSuccess?: () => void;
};

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
      <span role="button" tabIndex={0} onClick={() => onUploadSuccess?.()} onKeyDown={() => {}}>
        Trigger upload success
      </span>
    </div>
  ),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
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
          userId="user-1"
          {...overrides}
        />
      </QueryClientProvider>
    );

    return { onOpenChange, invalidateSpy };
  }

  it('shows upload error when file upload fails', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /trigger upload error/i }));

    expect(await screen.findByText(/upload failed from test/i)).toBeInTheDocument();
  });

  it('invalidates profile queries and closes dialog after upload success', () => {
    const { invalidateSpy, onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /trigger upload success/i }));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enhancedLanding'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profilePhoto'] });
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
