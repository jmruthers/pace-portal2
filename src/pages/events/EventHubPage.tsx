import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { createEventId } from '@solvera/pace-core/types';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { type EventHubData, useEventHub } from '@/hooks/events/useEventHub';
import { useFileReferences } from '@/hooks/events/useFileReferences';
import { EventLogo } from '@/components/events/EventLogo';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';

/** Absolute external URL participant website (no protocol heuristic). */
function participantWebsiteHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** PR14 authenticated participant hub at `/:eventSlug`.
 *
 * Intentionally not wrapped in {@link PagePermissionGuard} from `@solvera/pace-core/rbac`: catalogue
 * `rbac_app_pages` does not yet include a dedicated participant event-hub row for all tenants; access is
 * enforced by `ProtectedRoute` + organisation loading gate plus per-row visibility in hub data fetchers.
 */
export function EventHubPage() {
  const { eventSlug = '' } = useParams();
  const { isAuthenticated } = useUnifiedAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, errorMessage, notFound, reservedSlug } = useEventHub(eventSlug);
  const codeEnc = encodeURIComponent(eventSlug.trim());

  const scopes = data?.event.event_id != null &&
    typeof data.event.organisation_id === 'string' &&
    data.event.organisation_id.trim() !== ''
    ? [{ event_id: data.event.event_id, organisation_id: data.event.organisation_id }]
    : [];
  const { refByEventId, isLoading: logoBusy, isError: logoRefsFailed } = useFileReferences(scopes);
  const logoRef =
    data?.event.event_id != null
      ? (refByEventId.get(createEventId(data.event.event_id)) ?? null)
      : null;

  useEffect(() => {
    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      const login = `/login?redirect=${encodeURIComponent(returnTo)}`;
      navigate(login, { replace: true });
    }
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>Event</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  if (reservedSlug || notFound) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading event hub…" />
      </main>
    );
  }

  if (errorMessage && data == null) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  if (!data) {
    return <NotFoundPage />;
  }

  const ev = data.event;
  const websiteHref =
    typeof ev.participant_website_url === 'string'
      ? participantWebsiteHref(ev.participant_website_url)
      : null;
  const adminEmail =
    typeof ev.participant_admin_email === 'string' ? ev.participant_admin_email.trim() : '';

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>{ev.event_name}</h1>

      <section aria-label="Event summary" className="grid gap-4">
        <Card>
          <CardContent className="grid gap-4">
            {/* eslint-disable-next-line pace-core-compliance/prefer-semantic-html -- constrained logo framing inside summary card */}
            <span className="grid justify-items-start">
              <EventLogo
                eventName={ev.event_name}
                logoRef={logoRef}
                refsBusy={logoBusy}
                refsFailed={logoRefsFailed}
              />
            </span>
            {ev.event_date ? (
              <p>
                <time dateTime={ev.event_date}>{formatEventDateForDisplay(ev.event_date)}</time>
                {typeof ev.event_days === 'number' && Number.isFinite(ev.event_days) ? (
                  <> — {ev.event_days} days</>
                ) : null}
              </p>
            ) : null}
            {ev.participant_blurb?.trim() ? <p>{ev.participant_blurb.trim()}</p> : null}
            {adminEmail ? (
              <p>
                <a href={`mailto:${adminEmail}`}>Contact organisers</a>
              </p>
            ) : null}
            {websiteHref ? (
              <p>
                <a href={websiteHref}>{websiteHref}</a>
              </p>
            ) : null}
            {data.needsProfileSetup ? (
              <Alert>
                <AlertTitle>Finish your profile</AlertTitle>
                <AlertDescription>
                  Complete profile setup from the dashboard to track applications against this event.
                </AlertDescription>
              </Alert>
            ) : (
              <section aria-label="Application status" className="grid gap-2">
                <p>Application status</p>
                {data.applicationStatus ? (
                  <Badge variant="outline-sec-muted">{data.applicationStatus}</Badge>
                ) : (
                  <Badge variant="outline-sec-muted">None</Badge>
                )}
              </section>
            )}
          </CardContent>
        </Card>
      </section>

      {data.inactiveFormWindow ? (
        <Alert variant="destructive">
          <AlertTitle>Forms not open right now</AlertTitle>
          <AlertDescription>
            Event forms exist but none are accepting submissions during the current booking window.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Event forms">
        <h2>Forms</h2>
        {data.eligibleFormLinks.length === 0 ? (
          <p>No open forms linked to this event.</p>
        ) : (
          <ul className="grid gap-2 list-none">
            {data.eligibleFormLinks.map((f: EventHubData['eligibleFormLinks'][number]) => {
              const title = (f.title ?? '').trim();
              const fname = (f.name ?? '').trim();
              const label = title !== '' ? title : fname !== '' ? fname : f.slug;
              const slugRaw = typeof f.slug === 'string' ? f.slug.trim() : '';
              if (!slugRaw) return null;
              const slugEnc = encodeURIComponent(slugRaw);
              return (
                <li key={slugRaw}>
                  <Button type="button" variant="secondary" onClick={() => navigate(`/${codeEnc}/${slugEnc}`)}>
                    {label}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
