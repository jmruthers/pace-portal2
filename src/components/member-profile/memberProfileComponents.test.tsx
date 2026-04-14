import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

  it('ProfileSetupPrompt offers setup navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfileSetupPrompt />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /start setup/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start setup/i }));
  });

  it('PhotoGuidelines lists format rules', () => {
    render(<PhotoGuidelines />);
    expect(screen.getByRole('complementary', { name: /photo guidelines/i })).toBeInTheDocument();
    expect(screen.getByText(/jpg, png, or webp/i)).toBeInTheDocument();
  });
});
