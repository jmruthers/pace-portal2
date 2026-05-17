import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';
import { EventList } from '@/components/events/EventList';

export interface DashboardEventSelectorProps {
  eventsByCategory: Record<string, DashboardEvent[]>;
}

/**
 * Swappable dashboard event-selector slot (PR03 / PR14). Renders the current EventList interaction.
 */
export function DashboardEventSelector({ eventsByCategory }: DashboardEventSelectorProps) {
  return (
    <section aria-label="Event selector">
      <EventList eventsByCategory={eventsByCategory} />
    </section>
  );
}
