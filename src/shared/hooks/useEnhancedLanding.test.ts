import { describe, expect, it } from 'vitest';
import { groupEventsByRegistrationScope } from '@/shared/hooks/useEnhancedLanding';

describe('groupEventsByRegistrationScope', () => {
  it('buckets events by registration_scope with a default key', () => {
    const events = [
      {
        event_id: 'e1',
        registration_scope: 'camp',
        event_name: 'A',
        organisation_id: 'o1',
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
        participant_admin_email: null,
        participant_blurb: null,
        participant_website_url: null,
        typical_unit_size: null,
        updated_at: null,
        updated_by: null,
      },
      {
        event_id: 'e2',
        registration_scope: '',
        event_name: 'B',
        organisation_id: 'o1',
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
        participant_admin_email: null,
        participant_blurb: null,
        participant_website_url: null,
        typical_unit_size: null,
        updated_at: null,
        updated_by: null,
      },
    ] as const;

    const grouped = groupEventsByRegistrationScope([...events]);
    expect(grouped.camp?.length).toBe(1);
    expect(grouped.default?.length).toBe(1);
  });
});
