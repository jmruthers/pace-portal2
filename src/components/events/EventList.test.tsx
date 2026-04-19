import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EventList } from '@/components/events/EventList';

const sampleEvent = {
  event_id: 'e1',
  event_name: 'Summer camp',
  organisation_id: 'o1',
  registration_scope: 'camp',
  created_at: null,
  created_by: null,
  description: null,
  event_code: 'summer-camp',
  event_colours: null,
  event_date: null,
  event_days: null,
  event_email: null,
  event_venue: null,
  expected_participants: null,
  is_visible: true,
  public_readable: true,
  participant_admin_email: null,
  participant_blurb: null,
  participant_website_url: null,
  typical_unit_size: null,
  updated_at: null,
  updated_by: null,
  event_logo: 'https://example.com/logo.png',
} as const;

describe('EventList', () => {
  it('shows placeholder panel when an event is selected', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventList
          eventsByCategory={{
            camp: [sampleEvent],
          }}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /Summer camp/i }));
    expect(screen.getByLabelText('Selected event details')).toBeTruthy();
    expect(screen.getByText(/placeholder for PR14/i)).toBeTruthy();
    expect(screen.getByRole('img', { name: /Summer camp logo/i })).toHaveAttribute(
      'src',
      'https://example.com/logo.png'
    );
  });
});
