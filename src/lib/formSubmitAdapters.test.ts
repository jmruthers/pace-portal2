import { describe, expect, it } from 'vitest';
import { resolveSubmitMode } from '@/lib/formSubmitAdapters';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';

describe('formSubmitAdapters', () => {
  it('enables event registration only for base_registration on event routes', () => {
    const ev: FormEntrypoint = { kind: 'event_form', eventSlug: 'e', formSlug: 'f' };
    expect(resolveSubmitMode('base_registration', ev).mode).toBe('event_registration');
    expect(resolveSubmitMode('org_signup', ev).mode).toBe('none');
  });

  it('does not enable submit for org forms in this slice', () => {
    const org: FormEntrypoint = { kind: 'org_form', formSlug: 'signup' };
    const r = resolveSubmitMode('org_signup', org);
    expect(r.mode).toBe('none');
    if (r.mode === 'none') {
      expect(r.reason).toMatch(/follow-up/i);
    }
  });
});
