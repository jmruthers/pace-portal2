import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ParticipantItineraryDayList } from '@/components/events/ParticipantItineraryDayList';
import { useParticipantItinerary } from '@/hooks/events/useParticipantItinerary';

/** PR21 authenticated body: read-only participant itinerary (logic in {@link useParticipantItinerary}). */
export function ParticipantItineraryView() {
  const { eventSlug = '' } = useParams();
  const navigate = useNavigate();
  const vm = useParticipantItinerary(eventSlug);

  const backToEventHref = useMemo(() => {
    const s = eventSlug.trim();
    if (s === '') return '/';
    return `/${encodeURIComponent(s)}`;
  }, [eventSlug]);

  const onRetrySync = () => {
    void vm.refetch();
  };

  if (vm.phase === 'reserved' || vm.reservedSlug) {
    return <NotFoundPage />;
  }

  if (vm.phase === 'not_found') {
    return <NotFoundPage />;
  }

  if (vm.phase === 'loading_context') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <Alert variant="destructive">
          <AlertTitle>Organisation required</AlertTitle>
          <AlertDescription>Select an organisation before opening your itinerary.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (vm.phase === 'loading') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading itinerary…" />
      </main>
    );
  }

  if (vm.phase === 'needs_profile') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Itinerary</h1>
        <Alert>
          <AlertTitle>Finish your profile</AlertTitle>
          <AlertDescription>
            Complete profile setup from the dashboard before viewing your event itinerary.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  if (vm.phase === 'not_scoped') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Itinerary</h1>
        <Alert>
          <AlertTitle>No application for this event</AlertTitle>
          <AlertDescription>
            Your itinerary is available after you have an application for this event. Start or resume
            your application from the event page if you have not applied yet.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </main>
    );
  }

  if (vm.phase === 'access_denied') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Itinerary</h1>
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view itinerary details for this event.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </main>
    );
  }

  if (vm.phase === 'error') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Itinerary</h1>
        <Alert variant="destructive">
          <AlertTitle>Could not load itinerary</AlertTitle>
          <AlertDescription>{vm.errorMessage ?? 'Something went wrong.'}</AlertDescription>
        </Alert>
        <fieldset className="text-right">
          <Button type="button" variant="secondary" onClick={onRetrySync}>
            Try again
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
            Back to event
          </Button>
        </fieldset>
      </main>
    );
  }

  const eventName = vm.data?.event.event_name?.trim() || 'Event';

  if (vm.phase === 'ready_empty') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>{eventName} itinerary</h1>
        <Alert>
          <AlertTitle>No itinerary items yet</AlertTitle>
          <AlertDescription>
            Nothing is assigned to you for this event yet, or assigned items are not in a booked or
            confirmed state. Check back later or contact the organisers if you expected travel or
            accommodation details here.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </main>
    );
  }

  if (vm.phase !== 'ready' || !vm.data) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading itinerary…" />
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>{eventName} itinerary</h1>
      <p>Your assigned travel, activities, and accommodation for this event.</p>
      <ParticipantItineraryDayList days={vm.data.itinerary.days} />
      <fieldset className="text-right">
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </fieldset>
    </main>
  );
}
