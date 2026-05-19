import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';
import { validateUuid } from '@/shared/lib/utils/inputValidation';
import type { ApplicationProgressCheckRow } from '@/lib/applicationProgressContracts';
import { useApplicationProgress } from '@/hooks/events/useApplicationProgress';

/** PR18 authenticated body: progress states and BA05-shaped presentation (logic in {@link useApplicationProgress}). */
export function ApplicationProgressView() {
  const { eventSlug = '', applicationId = '' } = useParams();
  const navigate = useNavigate();
  const vm = useApplicationProgress(eventSlug, applicationId);
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
          <AlertDescription>Select an organisation before opening this page.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (vm.phase === 'loading') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading application progress…" />
      </main>
    );
  }

  if (vm.phase === 'invalid_id') {
    const idValidity = validateUuid(applicationId.trim());
    const invalidDescription = !isOk(idValidity)
      ? idValidity.error.message
      : 'That identifier is not valid.';
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Application progress</h1>
        <Alert variant="destructive">
          <AlertTitle>Invalid identifier</AlertTitle>
          <AlertDescription>{invalidDescription}</AlertDescription>
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
        <h1>Application progress</h1>
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            {vm.errorMessage ?? 'You cannot view this application.'}
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
        <h1>Application progress</h1>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{vm.errorMessage ?? 'Something went wrong.'}</AlertDescription>
        </Alert>
        <footer className="grid gap-2">
          <Button type="button" variant="secondary" onClick={onRetrySync}>
            Retry
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
            Back to event
          </Button>
        </footer>
      </main>
    );
  }

  if (vm.phase !== 'ready' || !vm.data) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load application progress.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const { event, progress } = vm.data;
  const appRow = progress.application;
  const reg = progress.registration_type;
  const checks = [...progress.checks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <header className="grid gap-4">
        <h1>{event.event_name ?? 'Application progress'}</h1>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </header>

      <section aria-label="Application" className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Application status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p>Status</p>
            <Badge variant="outline-sec-muted">{appRow.status}</Badge>
            {appRow.submitted_at ? (
              <p>
                Submitted{' '}
                <time dateTime={appRow.submitted_at}>
                  {formatEventDateForDisplay(appRow.submitted_at)}
                </time>
              </p>
            ) : null}
            {typeof appRow.referee_name === 'string' && appRow.referee_name.trim() !== '' ? (
              <section aria-label="Referee" className="grid gap-2">
                <p>Referee</p>
                <p>{appRow.referee_name.trim()}</p>
              </section>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration type</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p>{reg.name}</p>
            {reg.description?.trim() ? <p>{reg.description.trim()}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {checks.length === 0 ? (
              <p>No approval steps are recorded for this application.</p>
            ) : (
              <ul className="grid gap-4 list-none">
                {checks.map((c: ApplicationProgressCheckRow) => (
                  <li key={c.id}>
                    <section className="grid gap-2">
                      <p>{c.participant_check_label}</p>
                      <p>
                        Status: <Badge variant="outline-sec-muted">{c.status}</Badge>
                      </p>
                    </section>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
