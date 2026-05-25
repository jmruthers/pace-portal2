/** Participant-safe copy when an event registration application was already submitted. */
export const PARTICIPANT_ALREADY_SUBMITTED_MESSAGE =
  'You have already submitted an application for this event. Use Manage on the dashboard to view your application progress.';

export function isAlreadySubmittedParticipantMessage(message: string | null | undefined): boolean {
  if (message == null || message.trim() === '') {
    return false;
  }
  const m = message.toLowerCase();
  return (
    m.includes('already submitted') ||
    m.includes('already exists and is not a draft') ||
    m.includes('base_application_duplicate')
  );
}
