import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { createEventId } from '@solvera/pace-core/types';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';
import { deriveEventDashboardAction } from '@/hooks/events/eventDashboardAction';
import { useFileReferences } from '@/hooks/events/useFileReferences';
import { EventLogo } from '@/components/events/EventLogo';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';

export type EventListProps = {
  eventsByCategory: Record<string, DashboardEvent[]>;
  applicationStatusByEventId: Record<string, string>;
};

function organisationLabel(org: { display_name?: string | null; name?: string | null }): string {
  const d = org.display_name?.trim();
  const n = org.name?.trim();
  return d || n || '';
}

/**
 * PR14 dashboard event selector: Apply / Resume / Manage + authenticated logo display via {@link useFileReferences}.
 */
export function EventList({ eventsByCategory, applicationStatusByEventId }: EventListProps) {
  const navigate = useNavigate();
  const org = useOrganisationsContextOptional();
  const selectedOrgName = org?.selectedOrganisation
    ? organisationLabel(org.selectedOrganisation)
    : null;

  const flat = useMemo(
    () => Object.values(eventsByCategory).flat() as DashboardEvent[],
    [eventsByCategory]
  );

  const logoScopes = useMemo(
    () => flat.map((e) => ({ event_id: e.event_id, organisation_id: e.organisation_id })),
    [flat]
  );

  const { refByEventId, isLoading: logoRefsBusy, isError: logoRefsFailed } = useFileReferences(logoScopes);

  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of org?.organisations ?? []) {
      m.set(o.id, organisationLabel(o));
    }
    return m;
  }, [org?.organisations]);

  const multipleOrgsInList = useMemo(
    () => new Set(flat.map((e) => e.organisation_id)).size > 1,
    [flat]
  );

  const navigateForEvent = (ev: DashboardEvent) => {
    const codeRaw = ev.event_code?.trim() ?? '';
    if (!codeRaw) return;
    const code = encodeURIComponent(codeRaw);
    const status = applicationStatusByEventId[ev.event_id];
    const { intent } = deriveEventDashboardAction(status);
    if (intent === 'manage') {
      navigate(`/${code}`);
      return;
    }
    navigate(`/${code}/application`);
  };

  if (flat.length === 0) {
    const multiMembership = (org?.organisations?.length ?? 0) > 1;
    return (
      <section aria-label="Events">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No visible events yet for organisations you can access
              {selectedOrgName ? (
                <>
                  {' '}
                  (current context: <strong>{selectedOrgName}</strong>)
                </>
              ) : null}
              .
            </p>
            {multiMembership ? (
              <p>
                Use the <strong>organisation</strong> control in the header to switch which organisation you are
                working in. The dashboard lists events from every organisation your account can access.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Events">
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 list-none">
            {flat.map((ev) => {
              const logoRef = refByEventId.get(createEventId(ev.event_id)) ?? null;
              const applicationStatus = applicationStatusByEventId[ev.event_id];
              const { label } = deriveEventDashboardAction(applicationStatus);
              const codeOk = Boolean(ev.event_code?.trim());
              return (
                <li key={ev.event_id}>
                  <article
                    className="grid gap-2 rounded-md border border-sec-200 p-3"
                    aria-labelledby={`event-title-${ev.event_id}`}
                  >
                    <EventLogo
                      eventName={ev.event_name}
                      logoRef={logoRef}
                      refsBusy={logoRefsBusy}
                      refsFailed={logoRefsFailed}
                    />
                    <h2 id={`event-title-${ev.event_id}`}>{ev.event_name}</h2>
                    {ev.event_date ? (
                      <time dateTime={ev.event_date}>{formatEventDateForDisplay(ev.event_date)}</time>
                    ) : null}
                    {multipleOrgsInList ? <p>{orgNameById.get(ev.organisation_id) ?? 'Organisation'}</p> : null}
                    <Button
                      type="button"
                      variant={label === 'Manage' ? 'default' : 'secondary'}
                      disabled={!codeOk}
                      onClick={() => navigateForEvent(ev)}
                    >
                      {label}
                    </Button>
                  </article>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
