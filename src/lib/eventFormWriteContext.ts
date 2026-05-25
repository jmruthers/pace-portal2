/** Organisation id used for event-form draft/submit writes (`core_events.organisation_id`). */
export function resolveEventFormWriteOrganisationId(
  eventOrganisationId: string | null | undefined
): string | null {
  if (typeof eventOrganisationId !== 'string') {
    return null;
  }
  const trimmed = eventOrganisationId.trim();
  return trimmed !== '' ? trimmed : null;
}
