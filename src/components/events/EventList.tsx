import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import type { DashboardEvent } from '@/shared/hooks/useEnhancedLanding';

export type EventListProps = {
  eventsByCategory: Record<string, DashboardEvent[]>;
};

function initialsFromEventName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function isProbablyAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function organisationLabel(org: { display_name?: string | null; name?: string | null }): string {
  const d = org.display_name?.trim();
  const n = org.name?.trim();
  return d || n || '';
}

/**
 * Event selector rail + expandable panel placeholder (PR03). Replaceable in PR14.
 */
export function EventList({ eventsByCategory }: EventListProps) {
  const navigate = useNavigate();
  const org = useOrganisationsContextOptional();
  const selectedOrgName = org?.selectedOrganisation
    ? organisationLabel(org.selectedOrganisation)
    : null;

  const flat = useMemo(
    () => Object.values(eventsByCategory).flat() as DashboardEvent[],
    [eventsByCategory]
  );
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = flat.find((e) => e.event_id === selectedId) ?? null;

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
              const isSel = ev.event_id === selectedId;
              const logoSrc = ev.event_logo?.trim();
              const showImg = Boolean(logoSrc && (isProbablyAbsoluteUrl(logoSrc) || logoSrc.startsWith('/')));
              return (
                <li key={ev.event_id}>
                  <Button
                    type="button"
                    variant={isSel ? 'default' : 'secondary'}
                    className="grid h-full min-h-[14rem] w-full grid-rows-[8rem_auto] gap-2 p-3"
                    onClick={() => setSelectedId(isSel ? null : ev.event_id)}
                  >
                    {/* eslint-disable-next-line pace-core-compliance/prefer-semantic-html -- phrasing-only content inside Button */}
                    <span className="grid min-h-[8rem] place-items-center overflow-hidden rounded-md border border-sec-200 bg-sec-100">
                      {showImg && logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={`${ev.event_name} logo`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span aria-hidden="true">{initialsFromEventName(ev.event_name)}</span>
                      )}
                    </span>
                    {/* eslint-disable-next-line pace-core-compliance/prefer-semantic-html -- phrasing-only content inside Button */}
                    <span className="grid gap-1">
                      <strong>{ev.event_name}</strong>
                      {ev.event_date ? (
                        <time dateTime={ev.event_date}>{new Date(ev.event_date).toLocaleDateString()}</time>
                      ) : null}
                      {multipleOrgsInList ? (
                        <span>{orgNameById.get(ev.organisation_id) ?? 'Organisation'}</span>
                      ) : null}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
          {selected ? (
            <article className="rounded-md border border-sec-200 p-4" aria-label="Selected event details">
              <h3>{selected.event_name}</h3>
              <p>Forms and actions for this event will appear here (placeholder for PR14).</p>
              {selected.event_code ? (
                <p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/${selected.event_code}`)}
                  >
                    Open event hub
                  </Button>
                </p>
              ) : null}
            </article>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
