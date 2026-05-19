import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardEventSelector } from '@/components/events/DashboardEventSelector';

vi.mock('@/components/events/EventList', () => ({
  EventList: () => <div data-testid="event-list-stub">Events</div>,
}));

describe('DashboardEventSelector', () => {
  it('exposes an event-selector section wrapping EventList', () => {
    render(<DashboardEventSelector eventsByCategory={{}} applicationStatusByEventId={{}} />);
    expect(screen.getByRole('region', { name: 'Event selector' })).toBeInTheDocument();
    expect(screen.getByTestId('event-list-stub')).toBeInTheDocument();
  });
});
