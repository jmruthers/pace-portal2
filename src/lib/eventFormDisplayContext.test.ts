import { describe, expect, it } from 'vitest';
import {
  buildEventFormPresentation,
  resolveEventContactEmail,
  resolveEventDescription,
} from '@/lib/eventFormDisplayContext';

describe('eventFormDisplayContext', () => {
  it('prefers event_email then participant_admin_email', () => {
    expect(
      resolveEventContactEmail({
        event_email: ' events@example.com ',
        participant_admin_email: 'admin@example.com',
      } as never)
    ).toBe('events@example.com');
    expect(
      resolveEventContactEmail({
        event_email: null,
        participant_admin_email: ' admin@example.com ',
      } as never)
    ).toBe('admin@example.com');
  });

  it('uses core_events.description only', () => {
    expect(
      resolveEventDescription({
        description: ' Event description. ',
        participant_blurb: 'Participant blurb',
      } as never)
    ).toBe('Event description.');
    expect(
      resolveEventDescription({
        description: null,
        participant_blurb: ' Blurb only ',
      } as never)
    ).toBeNull();
  });

  it('builds presentation with trimmed event configuration fields', () => {
    const presentation = buildEventFormPresentation(
      {
        event_name: 'Cuboree 2026',
        event_date: '2026-09-27',
        event_email: 'cub@example.com',
        event_venue: ' Gilwell Park ',
        description: ' Event description. ',
        participant_blurb: ' A great camp. ',
      } as never,
      null,
      false,
      false
    );
    expect(presentation).toMatchObject({
      eventName: 'Cuboree 2026',
      eventDate: '2026-09-27',
      eventEmail: 'cub@example.com',
      eventVenue: 'Gilwell Park',
      eventDescription: 'Event description.',
    });
  });
});
