import type { FormEntrypoint } from '@/lib/formEntrypointResolution';

export type ResolvedSubmitMode =
  | { mode: 'event_registration' }
  | { mode: 'none'; reason: string };

/** PR17 — workflow submit handoff: only event `base_registration` uses PR16 in this slice. */
export function resolveSubmitMode(workflowType: string, entrypoint: FormEntrypoint): ResolvedSubmitMode {
  if (entrypoint.kind === 'org_form') {
    return {
      mode: 'none',
      reason: 'Submitting organisation forms from this route will arrive in a follow-up slice.',
    };
  }
  if (workflowType === 'base_registration') {
    return { mode: 'event_registration' };
  }
  return {
    mode: 'none',
    reason: 'Submission is not available for this workflow yet.',
  };
}
