import type { ReactNode } from 'react';
import { Button } from '@solvera/pace-core/components';
import type { FormJourneyPhase } from '@/hooks/forms/useFormJourney';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import type { SubmittedRegistrationSnapshot } from '@/lib/fetchSubmittedRegistrationSnapshot';
import { eventApplicationProgressPath } from '@/routing/eventFormPaths';

export type ParticipantProgressNavProps = {
  eventSlug: string;
  applicationId: string;
  onNavigate: (path: string) => void;
};

/** PR18 — Deep link from view-submitted form journey to application progress (hidden under proxy). */
export function ParticipantProgressNav({
  eventSlug,
  applicationId,
  onNavigate,
}: ParticipantProgressNavProps) {
  const slug = eventSlug.trim();
  const appId = applicationId.trim();
  if (slug === '' || appId === '') {
    return null;
  }

  return (
    <section aria-label="Application progress navigation" className="grid justify-items-start gap-4">
      <Button
        type="button"
        variant="secondary"
        onClick={() => onNavigate(eventApplicationProgressPath(slug, appId))}
      >
        View application progress
      </Button>
    </section>
  );
}

export type ParticipantProgressActionSlotProps = {
  entrypoint: FormEntrypoint;
  phase: FormJourneyPhase;
  submittedSnapshot: SubmittedRegistrationSnapshot | null;
  proxyActive: boolean;
  onNavigate: (path: string) => void;
};

/** Progress deep-link slot for view-submitted journey; null when hidden (PR18). */
export function ParticipantProgressActionSlot({
  entrypoint,
  phase,
  submittedSnapshot,
  proxyActive,
  onNavigate,
}: ParticipantProgressActionSlotProps): ReactNode {
  const eventSlug =
    entrypoint.kind === 'event_application' || entrypoint.kind === 'event_form'
      ? entrypoint.eventSlug.trim()
      : '';
  const appId = submittedSnapshot?.applicationId?.trim() ?? '';
  if (phase !== 'view_submitted' || appId === '' || proxyActive || eventSlug === '') {
    return null;
  }
  return <ParticipantProgressNav eventSlug={eventSlug} applicationId={appId} onNavigate={onNavigate} />;
}
