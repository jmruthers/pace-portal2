import { EventHubActivitiesSection } from '@/components/events/EventHubActivitiesSection';
import { EventHubItinerarySection } from '@/components/events/EventHubItinerarySection';

type EventHubWorkflowSectionsProps = {
  eventSlug: string;
  applicationStatus: string | null;
  needsProfileSetup: boolean;
};

/** PR14/PR19/PR21 participant workflow links on the event hub. */
export function EventHubWorkflowSections({
  eventSlug,
  applicationStatus,
  needsProfileSetup,
}: EventHubWorkflowSectionsProps) {
  if (needsProfileSetup) {
    return null;
  }

  const isScopedParticipant = applicationStatus != null;

  return (
    <>
      <EventHubActivitiesSection eventSlug={eventSlug} applicationStatus={applicationStatus} />
      {isScopedParticipant ? <EventHubItinerarySection eventSlug={eventSlug} /> : null}
    </>
  );
}
