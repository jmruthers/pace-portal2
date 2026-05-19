import { describe, expect, it } from 'vitest';
import { mapSubmissionErrorToToast } from '@/hooks/events/useApplicationSubmission';

describe('mapSubmissionErrorToToast', () => {
  it('maps MISSING_ORG_CONTEXT', () => {
    const r = mapSubmissionErrorToToast('MISSING_ORG_CONTEXT', '');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/organisation/i);
    expect(r.description).toMatch(/organisation/i);
  });

  it('maps PROXY_RESOLUTION_FAILED with message passthrough', () => {
    const r = mapSubmissionErrorToToast('PROXY_RESOLUTION_FAILED', 'Custom proxy message');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/delegated/i);
    expect(r.description).toBe('Custom proxy message');
  });

  it('maps DUPLICATE_SUBMIT_PREVENTED', () => {
    const r = mapSubmissionErrorToToast('DUPLICATE_SUBMIT_PREVENTED', 'Already done');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/already submitted/i);
    expect(r.description).toBe('Already done');
  });

  it('maps PARTIAL_PERSISTENCE', () => {
    const r = mapSubmissionErrorToToast('PARTIAL_PERSISTENCE', 'Retry later');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/incomplete/i);
    expect(r.description).toBe('Retry later');
  });

  it('maps RESPONSE_PERSISTENCE_FAILED', () => {
    const r = mapSubmissionErrorToToast('RESPONSE_PERSISTENCE_FAILED', 'Save failed');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/could not save answers/i);
    expect(r.description).toBe('Save failed');
  });

  it('maps VALIDATION_FAILED', () => {
    const r = mapSubmissionErrorToToast('VALIDATION_FAILED', 'Bad payload');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/cannot submit/i);
    expect(r.description).toBe('Bad payload');
  });

  it('maps APPLICATION_RPC_FAILED', () => {
    const r = mapSubmissionErrorToToast('APPLICATION_RPC_FAILED', 'RPC died');
    expect(r.variant).toBe('destructive');
    expect(r.title).toMatch(/submission failed/i);
    expect(r.description).toBe('RPC died');
  });
});
