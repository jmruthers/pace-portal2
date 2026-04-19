import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LinkedProfilesSection } from '@/components/contacts/LinkedProfilesSection';

vi.mock('@/shared/hooks/useLinkedProfiles', () => ({
  useLinkedProfiles: vi.fn(),
}));

import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';

function renderSection() {
  return render(
    <MemoryRouter>
      <LinkedProfilesSection />
    </MemoryRouter>
  );
}

describe('LinkedProfilesSection', () => {
  it('shows loading state', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);
    renderSection();
    expect(screen.getByText(/loading linked profiles/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    renderSection();
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
    renderSection();
    expect(screen.getByText(/A B/)).toBeInTheDocument();
    expect(screen.getByText(/Org — view/)).toBeInTheDocument();
  });

  it('shows view action when member_id is present; edit only when permission allows', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: [
        {
          person_id: 'p1',
          member_id: 'm1',
          first_name: 'A',
          last_name: 'B',
          organisation_name: 'Org',
          permission_type: 'view',
        },
        {
          person_id: 'p2',
          member_id: 'm2',
          first_name: 'C',
          last_name: 'D',
          organisation_name: 'Org2',
          permission_type: 'admin',
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    renderSection();
    expect(screen.getAllByRole('button', { name: /view profile/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /edit on their behalf/i })).toBeInTheDocument();
  });

  it('shows error alert when query fails', () => {
    vi.mocked(useLinkedProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('rpc down'),
    } as never);
    renderSection();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});
