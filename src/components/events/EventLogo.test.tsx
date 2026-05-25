import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FileReference } from '@solvera/pace-core/types';
import * as rbac from '@solvera/pace-core/rbac';
import * as hooks from '@solvera/pace-core/hooks';
import { EventLogo } from '@/components/events/EventLogo';

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useSecureSupabase: () => ({}),
  };
});

const logoRef = {
  id: 'fr1',
  table_name: 'core_events',
  record_id: 'e1',
  file_path: 'x/event_logo/logo.png',
  file_metadata: { fileName: 'logo', fileType: 'image/png', bucket: 'public-files', category: 'event_logo' },
  app_id: 'app-test',
  is_public: true,
  created_at: '2020-01-01',
  updated_at: '2020-01-01',
} satisfies FileReference;

describe('EventLogo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rbac, 'useSecureSupabase').mockReturnValue({} as never);
  });

  it('shows initials when no logo reference and not busy', () => {
    vi.spyOn(hooks, 'useFileDisplay').mockReturnValue({ url: null, isLoading: false, error: null });
    render(<EventLogo eventName="Summer camp" logoRef={null} refsBusy={false} />);
    expect(screen.getByText('SC')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows busy placeholder and hides initials while references are loading', () => {
    vi.spyOn(hooks, 'useFileDisplay').mockReturnValue({ url: null, isLoading: false, error: null });
    render(<EventLogo eventName="Summer camp" logoRef={null} refsBusy />);
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByText('SC')).not.toBeInTheDocument();
  });

  it('renders an inline image when a signed URL resolves for the logo reference', () => {
    vi.spyOn(hooks, 'useFileDisplay').mockReturnValue({
      url: 'https://signed.example/logo.png',
      isLoading: false,
      error: null,
    });
    render(<EventLogo eventName="Summer camp" logoRef={logoRef} refsBusy={false} />);
    expect(screen.getByRole('img', { name: /Summer camp logo/i })).toHaveAttribute(
      'src',
      'https://signed.example/logo.png'
    );
  });

  it('announces load failure when references failed and showing initials fallback', () => {
    vi.spyOn(hooks, 'useFileDisplay').mockReturnValue({ url: null, isLoading: false, error: null });
    render(<EventLogo eventName="Summer camp" logoRef={null} refsBusy={false} refsFailed />);
    expect(screen.getByText('SC')).toBeInTheDocument();
    expect(screen.getByText(/Event logo could not be loaded/i)).toBeInTheDocument();
  });
});
