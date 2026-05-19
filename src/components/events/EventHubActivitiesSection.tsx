import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Button } from '@solvera/pace-core/components';
import { eventActivityBookingPath } from '@/routing/eventFormPaths';

type EventHubActivitiesSectionProps = {
  eventSlug: string;
  applicationStatus: string | null;
};

/** PR19 — Event hub handoff to participant activity booking. */
export function EventHubActivitiesSection({
  eventSlug,
  applicationStatus,
}: EventHubActivitiesSectionProps) {
  const navigate = useNavigate();

  return (
    <section aria-label="Activity booking">
      <h2>Activities</h2>
      {applicationStatus === 'approved' ? (
        <fieldset className="text-right">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(eventActivityBookingPath(eventSlug))}
          >
            Book activities
          </Button>
        </fieldset>
      ) : applicationStatus ? (
        <Alert>
          <AlertTitle>Activity booking</AlertTitle>
          <AlertDescription>
            Activity booking opens when your application is approved. Current status:{' '}
            {applicationStatus}.
          </AlertDescription>
        </Alert>
      ) : (
        <p>Submit an application for this event before booking activities.</p>
      )}
    </section>
  );
}
