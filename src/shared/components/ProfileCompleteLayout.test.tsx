import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileCompleteLayout } from '@/shared/components/ProfileCompleteLayout';

vi.mock('@solvera/pace-core', () => ({
  useUnifiedAuthContext: () => ({
    user: { email: 'a@b.c', user_metadata: {} },
    signOut: vi.fn(),
  }),
}));

describe('ProfileCompleteLayout', () => {
  it('uses profile-completion navigation chrome without main app header label', () => {
    render(
      <MemoryRouter>
        <ProfileCompleteLayout>
          <p>Wizard</p>
        </ProfileCompleteLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Profile completion' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Application header' })).toBeNull();
    expect(screen.getByText('Wizard')).toBeTruthy();
  });
});
