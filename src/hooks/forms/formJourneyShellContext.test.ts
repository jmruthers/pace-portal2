import { describe, expect, it } from 'vitest';
import type { FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';
import {
  readyToFormJourneyContext,
  resolveEffectivePersonId,
  resolveFormJourneyDisplayPerson,
  resolveFormJourneyFieldContext,
  resolveFormJourneyMemberId,
} from '@/hooks/forms/formJourneyShellContext';

const eventReady = {
  kind: 'event' as const,
  event: { event_name: 'Camp', event_id: 'ev-1', organisation_id: 'org-event' },
  form: { id: 'f1', title: 'Reg', name: 'Reg', description: null, workflow_type: null },
  fieldRows: [],
  confirmationKeys: [],
} as unknown as FormJourneyReady;

const orgReady = {
  kind: 'org' as const,
  shellTitle: 'Org form',
  form: { id: 'f2', title: 'Join', name: 'Join', description: null, workflow_type: null },
  fieldRows: [{ id: 'row-1' }],
  confirmationKeys: ['ack'],
} as unknown as FormJourneyReady;

describe('formJourneyShellContext', () => {
  it('readyToFormJourneyContext maps event and org form entrypoints', () => {
    expect(readyToFormJourneyContext(eventReady).eventId).toBe('ev-1');

    const orgCtx = readyToFormJourneyContext(orgReady);
    expect(orgCtx.eventId).toBeNull();
    expect(orgCtx.fieldRows).toHaveLength(1);
  });

  it('resolveFormJourneyFieldContext prefers event host org for writes', () => {
    const ctx = resolveFormJourneyFieldContext(eventReady, 'org-switcher');
    expect(ctx.writeOrganisationId).toBe('org-event');
    expect(ctx.ctxEventId).toBe('ev-1');
  });

  it('resolveFormJourneyFieldContext uses switcher org for org forms', () => {
    const orgFormReady = {
      ...orgReady,
      shellTitle: 'Join',
      fieldRows: [],
      confirmationKeys: [],
    } as FormJourneyReady;

    const ctx = resolveFormJourneyFieldContext(orgFormReady, 'org-switcher');
    expect(ctx.writeOrganisationId).toBe('org-switcher');
    expect(ctx.ctxEventId).toBeNull();
    expect(ctx.ctxFormId).toBe('f2');
  });

  it('resolveFormJourneyFieldContext returns empty context when entrypoint is not ready', () => {
    const ctx = resolveFormJourneyFieldContext(undefined, 'org-switcher');
    expect(ctx.ctxRows).toEqual([]);
    expect(ctx.ctxEventId).toBeNull();
    expect(ctx.ctxFormId).toBeNull();
    expect(ctx.writeOrganisationId).toBe('org-switcher');
  });

  it('resolveEffectivePersonId and member id honour proxy targets', () => {
    const proxy = {
      isProxyActive: true,
      targetPersonId: 'p-proxy',
      targetMemberId: 'm-proxy',
    };
    expect(resolveEffectivePersonId(proxy as never, 'p-self')).toBe('p-proxy');
    expect(resolveFormJourneyMemberId(proxy as never, 'm-self')).toBe('m-proxy');
  });

  it('resolveFormJourneyDisplayPerson prefers proxy target person', () => {
    const person = resolveFormJourneyDisplayPerson({
      proxy: { isProxyActive: true, targetPersonId: 'p1' } as never,
      targetPersonQuery: {
        data: { first_name: 'Proxy', last_name: 'User', email: 'p@example.com' },
      } as never,
      selfPerson: { first_name: 'Self', last_name: 'User', email: 's@example.com' },
    });
    expect(person?.email).toBe('p@example.com');
  });

  it('resolveFormJourneyDisplayPerson falls back to self person then null', () => {
    const self = resolveFormJourneyDisplayPerson({
      proxy: { isProxyActive: false } as never,
      targetPersonQuery: { data: undefined } as never,
      selfPerson: { first_name: 'Self', last_name: 'User', email: 's@example.com' },
    });
    expect(self?.first_name).toBe('Self');

    const none = resolveFormJourneyDisplayPerson({
      proxy: { isProxyActive: false } as never,
      targetPersonQuery: { data: undefined } as never,
      selfPerson: null,
    });
    expect(none).toBeNull();
  });
});
