import { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import type { Database } from '@/types/pace-database';

type EventRow = Database['public']['Tables']['core_events']['Row'];

export type EventListProps = {
  eventsByCategory: Record<string, EventRow[]>;
};

/**
 * Event selector rail + expandable panel placeholder (PR03). Replaceable in PR14.
 */
export function EventList({ eventsByCategory }: EventListProps) {
  const flat = useMemo(
    () => Object.values(eventsByCategory).flat() as EventRow[],
    [eventsByCategory]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = flat.find((e) => e.event_id === selectedId) ?? null;

  if (flat.length === 0) {
    return (
      <section aria-label="Events">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No events listed for this organisation yet.</p>
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
        <CardContent className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
          {flat.map((ev) => {
            const isSel = ev.event_id === selectedId;
            return (
              <Button
                key={ev.event_id}
                type="button"
                variant={isSel ? 'default' : 'secondary'}
                onClick={() => setSelectedId(isSel ? null : ev.event_id)}
              >
                {ev.event_name}
              </Button>
            );
          })}
          {selected ? (
            <article
              className="col-span-full rounded-md border border-sec-200 p-4"
              aria-label="Selected event details"
            >
              <h3>{selected.event_name}</h3>
              <p>Forms and actions for this event will appear here (placeholder for PR14).</p>
            </article>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
