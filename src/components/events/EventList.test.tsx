import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventList } from '@/components/events/EventList';

describe('EventList', () => {
  it('shows placeholder panel when an event is selected', async () => {
    const user = userEvent.setup();
    render(
      <EventList
        eventsByCategory={{
          camp: [
            {
              event_id: 'e1',
              event_name: 'Summer camp',
              organisation_id: 'o1',
              registration_scope: 'camp',
              created_at: null,
              created_by: null,
              description: null,
              event_code: null,
              event_colours: null,
              event_date: null,
              event_days: null,
              event_email: null,
              event_venue: null,
              expected_participants: null,
              is_visible: null,
              public_readable: true,
              typical_unit_size: null,
              updated_at: null,
              updated_by: null,
            },
          ],
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Summer camp' }));
    expect(screen.getByLabelText('Selected event details')).toBeTruthy();
    expect(screen.getByText(/placeholder for PR14/i)).toBeTruthy();
  });
});
