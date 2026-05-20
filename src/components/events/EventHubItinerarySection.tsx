import { useNavigate } from 'react-router-dom';
import { Button } from '@solvera/pace-core/components';
import { eventItineraryPath } from '@/routing/eventFormPaths';

type EventHubItinerarySectionProps = {
  eventSlug: string;
};

/** PR21 — Event hub handoff to participant itinerary. */
export function EventHubItinerarySection({ eventSlug }: EventHubItinerarySectionProps) {
  const navigate = useNavigate();

  return (
    <section aria-label="Itinerary">
      <h2>Itinerary</h2>
      <fieldset className="text-right">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(eventItineraryPath(eventSlug))}
        >
          View itinerary
        </Button>
      </fieldset>
    </section>
  );
}
