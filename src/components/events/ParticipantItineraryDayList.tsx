import { Badge, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import type { ParticipantItineraryDayView } from '@/lib/participantItineraryContracts';
import { resourceTypeLabel } from '@/lib/participantItineraryLabels';

type ParticipantItineraryDayListProps = {
  days: ParticipantItineraryDayView[];
};

/** PR21 read-only day-grouped itinerary list. */
export function ParticipantItineraryDayList({ days }: ParticipantItineraryDayListProps) {
  return (
    <section aria-label="Itinerary by day" className="grid gap-4">
      {days.map((day) => (
        <Card key={day.dayKey}>
          <CardHeader>
            <CardTitle>
              <time dateTime={day.dayKey}>{day.dayKey}</time>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 list-none">
              {day.items.map((item) => (
                <li
                  key={`${item.entry.resourceType}:${item.entry.resourceId}:${item.entry.entryKind}:${item.entry.dayKey}`}
                  className="grid gap-1"
                >
                  <section className="grid gap-1">
                    <p>
                      <strong>{item.title}</strong>
                    </p>
                    <Badge variant="outline-sec-muted">
                      {resourceTypeLabel(item.entry.resourceType)}
                    </Badge>
                    {item.whenLabel ? <p>{item.whenLabel}</p> : null}
                    {item.detail ? <p>{item.detail}</p> : null}
                  </section>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
