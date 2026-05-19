import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { NotFoundPage } from '@/pages/NotFoundPage';

const FormFillPage = lazy(async () => {
  const m = await import('@/pages/events/FormFillPage');
  return { default: m.FormFillPage };
});

const ApplicationProgressPage = lazy(async () => {
  const m = await import('@/pages/events/ApplicationProgressPage');
  return { default: m.ApplicationProgressPage };
});

const ActivityBookingPage = lazy(async () => {
  const m = await import('@/pages/events/ActivityBookingPage');
  return { default: m.ActivityBookingPage };
});

/** Authenticated participant activity booking (`/:eventSlug/activities`, PR19). */
export function EventActivityBookingRoute() {
  const { eventSlug = '' } = useParams();
  if (eventSlug === '' || isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Loading activity booking…" />
        </main>
      }
    >
      <ActivityBookingPage />
    </Suspense>
  );
}

/** Authenticated participant progress (`/:eventSlug/applications/:applicationId`, PR18). */
export function EventApplicationProgressRoute() {
  const { eventSlug = '', applicationId = '' } = useParams();
  if (eventSlug === '' || applicationId === '') {
    return <NotFoundPage />;
  }
  if (isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Loading application progress…" />
        </main>
      }
    >
      <ApplicationProgressPage />
    </Suspense>
  );
}

function FormFillSuspense({ eventSlug, formSlug }: { eventSlug: string; formSlug: string | null }) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Loading form…" />
        </main>
      }
    >
      <FormFillPage eventSlug={eventSlug} formSlug={formSlug} />
    </Suspense>
  );
}

/** Primary `/:eventSlug/application` → primary form (PR15). */
export function EventApplicationRoute() {
  const { eventSlug = '' } = useParams();
  if (eventSlug === '' || isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }
  return <FormFillSuspense eventSlug={eventSlug} formSlug={null} />;
}

/** `/:eventSlug/:formSlug` explicit form (PR15). */
export function EventFormRoute() {
  const { eventSlug = '', formSlug = '' } = useParams();
  if (eventSlug === '' || formSlug === '') {
    return <NotFoundPage />;
  }
  if (isReservedEventSlug(eventSlug)) {
    return <NotFoundPage />;
  }
  return <FormFillSuspense eventSlug={eventSlug} formSlug={formSlug} />;
}
