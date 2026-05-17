import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '@solvera/pace-core/components';
import { isReservedEventSlug } from '@/routing/eventFormPaths';
import { NotFoundPage } from '@/pages/NotFoundPage';

const FormFillPage = lazy(async () => {
  const m = await import('@/pages/events/FormFillPage');
  return { default: m.FormFillPage };
});

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
