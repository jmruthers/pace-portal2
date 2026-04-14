import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LinkedProfilesSection } from '@/components/contacts/LinkedProfilesSection';

vi.mock('@/shared/hooks/useLinkedProfiles', () => ({
  useLinkedProfiles: vi.fn(),
}));

import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';

describe('LinkedProfilesSection', () => {
  it('shows loading state', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);
    render(<LinkedProfilesSection />);
    expect(screen.getByText(/loading linked profiles/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    render(<LinkedProfilesSection />);
    expect(screen.getByText(/no linked profiles yet/i)).toBeInTheDocument();
  });

  it('lists linked profiles when data exists', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: [
        {
          person_id: 'p1',
          first_name: 'A',
          last_name: 'B',
          organisation_name: 'Org',
          permission_type: 'view',
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    render(<LinkedProfilesSection />);
    expect(screen.getByText(/A B/)).toBeInTheDocument();
    expect(screen.getByText(/Org — view/)).toBeInTheDocument();
  });

  it('shows error alert when query fails', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('rpc down'),
    } as never);
    render(<LinkedProfilesSection />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});
