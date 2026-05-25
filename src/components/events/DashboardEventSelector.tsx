import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';
import { EventList } from '@/components/events/EventList';

export interface DashboardEventSelectorProps {
  eventsByCategory: Record<string, DashboardEvent[]>;
  applicationStatusByEventId: Record<string, string>;
  formResponseOpenByEventId?: Record<string, boolean>;
}

/**
 * Swappable dashboard event-selector slot (PR03 / PR14). Renders the current EventList interaction.
 */
export function DashboardEventSelector({
  eventsByCategory,
  applicationStatusByEventId,
  formResponseOpenByEventId,
}: DashboardEventSelectorProps) {
  return (
    <section aria-label="Event selector">
      <EventList
        eventsByCategory={eventsByCategory}
        applicationStatusByEventId={applicationStatusByEventId}
        formResponseOpenByEventId={formResponseOpenByEventId}
      />
    </section>
  );
}
