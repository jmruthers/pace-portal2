import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EventHubActivitiesSection } from '@/components/events/EventHubActivitiesSection';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('EventHubActivitiesSection', () => {
  it('navigates to activity booking when application is approved', async () => {
    const user = userEvent.setup();
    navigateMock.mockClear();
    render(
      <MemoryRouter>
        <EventHubActivitiesSection eventSlug="summer-camp" applicationStatus="approved" />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Book activities' }));
    expect(navigateMock).toHaveBeenCalledWith('/summer-camp/activities');
  });

  it('prompts to submit application when application status is null', () => {
    render(
      <MemoryRouter>
        <EventHubActivitiesSection eventSlug="summer-camp" applicationStatus={null} />
      </MemoryRouter>
    );
    expect(
      screen.getByText(/submit an application for this event before booking activities/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book activities' })).not.toBeInTheDocument();
  });

  it('shows status message when application is not approved', () => {
    render(
      <MemoryRouter>
        <EventHubActivitiesSection eventSlug="summer-camp" applicationStatus="submitted" />
      </MemoryRouter>
    );
    expect(screen.getByText(/activity booking opens when your application is approved/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book activities' })).not.toBeInTheDocument();
  });
});
