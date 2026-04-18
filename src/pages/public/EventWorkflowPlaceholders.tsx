import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useResolveEventByCode } from '@/shared/hooks/useResolveEventByCode';

/**
 * PR01 placeholder for participant event hub at `/:eventSlug` (PR14 will replace interaction).
 */
export function EventHubPlaceholderPage() {
  const { eventSlug = '' } = useParams();
  const resolve = useResolveEventByCode(eventSlug);

  if (!eventSlug || isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }

  if (resolve === 'loading') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading event…" />
      </main>
    );
  }

  if (resolve === 'missing' || resolve === 'error') {
    return <NotFoundPage />;
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>Event</h1>
      <p>
        Event hub for <strong>{eventSlug}</strong> will load here (PR14).
      </p>
    </main>
  );
}

/**
 * PR01 placeholder for `/:eventSlug/application` (PR16 handoff; PR14 routing).
 */
export function EventApplicationPlaceholderPage() {
  const { eventSlug = '' } = useParams();
  const resolve = useResolveEventByCode(eventSlug);

  if (!eventSlug || isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }

  if (resolve === 'loading') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading application…" />
      </main>
    );
  }

  if (resolve === 'missing' || resolve === 'error') {
    return <NotFoundPage />;
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>Application</h1>
      <p>
        Application flow for event <strong>{eventSlug}</strong> will load here (PR14–PR16).
      </p>
    </main>
  );
}
