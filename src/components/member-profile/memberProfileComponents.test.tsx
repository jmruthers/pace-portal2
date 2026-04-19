import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilePrompts } from '@/components/member-profile/ProfilePrompts';
import { ProfileSetupPrompt } from '@/components/member-profile/ProfileSetupPrompt';
import { PhotoGuidelines } from '@/components/member-profile/PhotoGuidelines';

describe('member profile composition (PR03)', () => {
  it('ProfilePrompts shows completion and navigation affordances', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePrompts
          profileProgress={{ completionRatio: 0.5, totalFields: 9, filledFields: 4 }}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('region', { name: /profile prompts/i })).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    const opens = screen.getAllByRole('button', { name: /^open$/i });
    expect(opens.length).toBe(3);
    for (const btn of opens) {
      await user.click(btn);
    }
  });

  it('ProfilePrompts delegated context routes member profile to profile edit', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProfilePrompts
                profileProgress={{ completionRatio: 0.5, totalFields: 9, filledFields: 4 }}
                navContext={{ kind: 'delegated', memberId: 'm-delegated' }}
              />
            }
          />
          <Route path="/profile/edit/:memberId" element={<p>Edit delegated target</p>} />
          <Route path="/member-profile" element={<p>Self service</p>} />
          <Route path="/medical-profile" element={<p>Medical</p>} />
          <Route path="/additional-contacts" element={<p>Contacts</p>} />
        </Routes>
      </MemoryRouter>
    );
    const opens = screen.getAllByRole('button', { name: /^open$/i });
    await user.click(opens[0]!);
    expect(screen.getByText(/edit delegated target/i)).toBeInTheDocument();
  });

  it('ProfileSetupPrompt offers setup navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProfileSetupPrompt />} />
          <Route path="/profile-complete" element={<p>Profile wizard</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /start setup/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start setup/i }));
    expect(screen.getByText(/profile wizard/i)).toBeInTheDocument();
  });

  it('PhotoGuidelines lists format rules', () => {
    render(<PhotoGuidelines />);
    expect(screen.getByRole('complementary', { name: /photo guidelines/i })).toBeInTheDocument();
    expect(screen.getByText(/jpg, png, or webp/i)).toBeInTheDocument();
  });
});
