import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationEventHeader } from '@/components/events/ApplicationEventHeader';

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => null,
}));

describe('ApplicationEventHeader', () => {
  it('renders event configuration and form title with logo region', () => {
    render(
      <ApplicationEventHeader
        eventName="Cuboree 2026"
        formTitle="Application"
        eventDate="2026-09-27"
        eventEmail="cub@example.com"
        eventVenue="Gilwell Park"
        eventDescription="This is the event description."
        logoRef={null}
        logoBusy={false}
        logoRefsFailed={false}
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Cuboree 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Application' })).toBeInTheDocument();
    expect(screen.getByText('Gilwell Park')).toBeInTheDocument();
    expect(screen.getByText('This is the event description.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'cub@example.com' })).toHaveAttribute(
      'href',
      'mailto:cub@example.com'
    );
  });
});
