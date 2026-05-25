import type { EventFormPresentation } from '@/lib/eventFormDisplayContext';
import { EventLogo } from '@/components/events/EventLogo';
import { formatEventDateForDisplay } from '@/shared/lib/formatEventDateForDisplay';

export type ApplicationEventHeaderProps = EventFormPresentation & {
  formTitle: string;
};

/**
 * Event application form header: titles and configuration on the left, logo prominently on the right.
 */
export function ApplicationEventHeader({
  eventName,
  formTitle,
  eventDate,
  eventEmail,
  eventVenue,
  eventDescription,
  logoRef,
  logoBusy,
  logoRefsFailed,
}: ApplicationEventHeaderProps) {
  return (
    <section
      aria-label="Event details"
      className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,14rem)] items-start gap-4"
    >
      <article className="grid gap-2">
        <h1>{eventName}</h1>
        <h2>{formTitle}</h2>
        {eventDate ? (
          <p>
            <time dateTime={eventDate}>{formatEventDateForDisplay(eventDate)}</time>
          </p>
        ) : null}
        {eventEmail ? (
          <p>
            <a href={`mailto:${eventEmail}`}>{eventEmail}</a>
          </p>
        ) : null}
        {eventVenue ? <p>{eventVenue}</p> : null}
        {eventDescription ? <p>{eventDescription}</p> : null}
      </article>
      <EventLogo
        eventName={eventName}
        logoRef={logoRef}
        refsBusy={logoBusy}
        refsFailed={logoRefsFailed}
      />
    </section>
  );
}
