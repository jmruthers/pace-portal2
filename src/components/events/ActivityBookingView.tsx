import { useMemo, useState } from 'react';
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
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogPortal,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';
import { primaryBookingBlockMessage } from '@/lib/activityBookingContracts';
import type { OfferingBrowseItem, SessionBrowseItem } from '@/lib/activityBookingTypes';
import { useActivityBooking } from '@/hooks/events/useActivityBooking';

function formatSessionWhen(start: string, end: string): string {
  const startLabel = formatEventDateForDisplay(start);
  const endLabel = formatEventDateForDisplay(end);
  return `${startLabel} – ${endLabel}`;
}

function sessionActionLabel(session: SessionBrowseItem): string {
  if (session.capacityFull && session.waitlistOpen) {
    return 'Join waitlist';
  }
  if (session.capacityFull) {
    return 'Session full';
  }
  return 'Book session';
}

/** PR19 authenticated body: activity browse, book, and cancel (logic in {@link useActivityBooking}). */
export function ActivityBookingView() {
  const { eventSlug = '' } = useParams();
  const navigate = useNavigate();
  const vm = useActivityBooking(eventSlug);
  const { isProxyActive } = useProxyMode();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [consentBySession, setConsentBySession] = useState<Record<string, boolean>>({});
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const backToEventHref = useMemo(() => {
    const s = eventSlug.trim();
    if (s === '') return '/';
    return `/${encodeURIComponent(s)}`;
  }, [eventSlug]);

  const onRetrySync = () => {
    void vm.refetch();
  };

  const handleBook = async (sessionId: string) => {
    const validation = vm.validateSession(sessionId);
    if (!validation) return;
    if (!validation.canBook) return;
    const consentOk = !validation.consentRequired || consentBySession[sessionId] === true;
    const result = await vm.bookSession(sessionId, consentOk);
    if (isOk(result)) {
      setPendingSessionId(null);
      setConsentBySession((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    const result = await vm.cancelBooking(cancelTargetId);
    if (isOk(result)) {
      setCancelTargetId(null);
    }
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
          <AlertDescription>Select an organisation before opening activity booking.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (vm.phase === 'loading') {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading activities…" />
      </main>
    );
  }

  if (vm.phase === 'needs_profile') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Activity booking</h1>
        <Alert>
          <AlertTitle>Finish your profile</AlertTitle>
          <AlertDescription>
            Complete profile setup from the dashboard before booking activities for this event.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </main>
    );
  }

  if (vm.phase === 'no_application') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>Activity booking</h1>
        <Alert>
          <AlertTitle>No application</AlertTitle>
          <AlertDescription>
            Submit an application for this event before you can book activities.
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
        <h1>Activity booking</h1>
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            {vm.errorMessage ?? 'You cannot book activities for this event.'}
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
        <h1>Activity booking</h1>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{vm.errorMessage ?? 'Could not load activity booking.'}</AlertDescription>
        </Alert>
        <fieldset className="text-right">
          <Button type="button" variant="secondary" onClick={onRetrySync}>
            Try again
          </Button>
        </fieldset>
        <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
          Back to event
        </Button>
      </main>
    );
  }

  const data = vm.data;
  if (!data) {
    return <NotFoundPage />;
  }

  const canMutate = vm.phase === 'ready' && !isProxyActive;

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>Activity booking</h1>
      <p>{data.event.event_name}</p>

      {isProxyActive ? <ProxyModeBanner /> : null}

      {vm.phase === 'not_approved' ? (
        <Alert variant="destructive">
          <AlertTitle>Application not approved</AlertTitle>
          <AlertDescription>
            Activity booking opens when your application is approved. Current status:{' '}
            {data.application.status}.
          </AlertDescription>
        </Alert>
      ) : null}

      {vm.lastActionError ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{vm.lastActionError}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Your bookings" className="grid gap-4">
        <h2>Your bookings</h2>
        {data.bookings.length === 0 ? (
          <p>You have no activity bookings for this event yet.</p>
        ) : (
          <ul className="grid gap-2 list-none">
            {data.bookings.map((b) => (
              <li key={b.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>{b.offering_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <p>
                      {b.session_name?.trim() ? b.session_name : 'Session'}{' '}
                      <time dateTime={b.start_time}>{formatSessionWhen(b.start_time, b.end_time)}</time>
                    </p>
                    <Badge variant="outline-sec-muted">{b.status}</Badge>
                    {b.onWaitlist ? (
                      <p>You are on the waitlist for this session.</p>
                    ) : null}
                    {canMutate && b.cancellable ? (
                      <fieldset className="text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={vm.cancelPending}
                          onClick={() => setCancelTargetId(b.id)}
                        >
                          Cancel booking
                        </Button>
                      </fieldset>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Available activities" className="grid gap-4">
        <h2>Available activities</h2>
        {data.offerings.length === 0 ? (
          <p>No activities are available for booking right now.</p>
        ) : (
          <ul className="grid gap-4 list-none">
            {data.offerings.map((offering: OfferingBrowseItem) => (
              <li key={offering.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>{offering.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {offering.description?.trim() ? <p>{offering.description.trim()}</p> : null}
                    {!offering.bookingWindowOpen ? (
                      <Alert>
                        <AlertTitle>Booking closed</AlertTitle>
                        <AlertDescription>
                          Booking is not open for this activity right now.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    {offering.sessions.length === 0 ? (
                      <p>No sessions scheduled.</p>
                    ) : (
                      <ul className="grid gap-2 list-none">
                        {offering.sessions.map((session: SessionBrowseItem) => {
                          const validation = vm.validateSession(session.id);
                          const blockMsg =
                            validation != null ? primaryBookingBlockMessage(validation) : null;
                          const expanded = pendingSessionId === session.id;
                          const showBook =
                            canMutate && offering.bookingWindowOpen && validation?.canBook;

                          return (
                            <li key={session.id}>
                              <article className="grid gap-2 rounded-md border border-sec-200 p-4">
                                <h3>{session.session_name?.trim() || offering.name}</h3>
                                <p>
                                  <time dateTime={session.start_time}>
                                    {formatSessionWhen(session.start_time, session.end_time)}
                                  </time>
                                </p>
                                {session.location_display?.trim() ? (
                                  <p>{session.location_display.trim()}</p>
                                ) : null}
                                <p>
                                  {session.confirmedCount} of {session.capacity} places confirmed
                                  {session.capacityFull && session.waitlistOpen
                                    ? ' — waitlist open'
                                    : session.capacityFull
                                      ? ' — full'
                                      : ''}
                                </p>
                                {blockMsg && !expanded ? (
                                  <Alert>
                                    <AlertDescription>{blockMsg}</AlertDescription>
                                  </Alert>
                                ) : null}
                                {showBook && !expanded ? (
                                  <fieldset className="text-right">
                                    <Button
                                      type="button"
                                      variant="default"
                                      disabled={session.capacityFull && !session.waitlistOpen}
                                      onClick={() => {
                                        vm.clearLastActionError();
                                        setPendingSessionId(session.id);
                                      }}
                                    >
                                      {sessionActionLabel(session)}
                                    </Button>
                                  </fieldset>
                                ) : null}
                                {expanded && validation ? (
                                  <section className="grid gap-2" aria-label="Confirm booking">
                                    {validation.consentRequired && validation.consentText ? (
                                      <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                                        <Checkbox
                                          checked={consentBySession[session.id] === true}
                                          onChange={(next) =>
                                            setConsentBySession((prev) => ({
                                              ...prev,
                                              [session.id]: next === true,
                                            }))
                                          }
                                        />
                                        <span>{validation.consentText}</span>
                                      </Label>
                                    ) : null}
                                    {primaryBookingBlockMessage(validation) ? (
                                      <Alert>
                                        <AlertDescription>
                                          {primaryBookingBlockMessage(validation)}
                                        </AlertDescription>
                                      </Alert>
                                    ) : null}
                                    <fieldset className="text-right">
                                      <Button
                                        type="button"
                                        variant="default"
                                        disabled={
                                          vm.bookPending ||
                                          !validation.canBook ||
                                          (validation.consentRequired &&
                                            consentBySession[session.id] !== true)
                                        }
                                        onClick={() => void handleBook(session.id)}
                                      >
                                        {session.capacityFull && session.waitlistOpen
                                          ? 'Confirm waitlist'
                                          : 'Confirm booking'}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setPendingSessionId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </fieldset>
                                  </section>
                                ) : null}
                              </article>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button type="button" variant="secondary" onClick={() => navigate(backToEventHref)}>
        Back to event
      </Button>

      <Dialog open={cancelTargetId != null} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <DialogPortal>
          <DialogContent>
            <DialogBody className="grid gap-4">
              <h2>Cancel booking</h2>
              <p>Are you sure you want to cancel this activity booking?</p>
              <fieldset className="text-right">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={vm.cancelPending}
                  onClick={() => void handleCancelConfirm()}
                >
                  Confirm cancellation
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCancelTargetId(null)}>
                  Keep booking
                </Button>
              </fieldset>
            </DialogBody>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </main>
  );
}
