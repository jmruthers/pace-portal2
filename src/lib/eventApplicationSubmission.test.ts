import { describe, expect, it, vi } from 'vitest';
import { ok, err, isOk, isErr } from '@solvera/pace-core/types';
import * as draftMod from '@/lib/eventDraftPersistence';
import {
  fetchRegistrationTypeIdForForm,
  submitEventApplication,
} from '@/lib/eventApplicationSubmission';

describe('submitEventApplication', () => {
  it('returns MISSING_ORG_CONTEXT when organisation is absent', async () => {
    const client = {} as never;
    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: '',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('MISSING_ORG_CONTEXT');
  });

  it('returns DUPLICATE_SUBMIT_PREVENTED when application is not draft', async () => {
    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'app-1', status: 'approved' },
            error: null,
          }),
        };
      }
      return {};
    });
    const client = { from, rpc: vi.fn() } as never;

    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('DUPLICATE_SUBMIT_PREVENTED');
  });

  it('happy path: persist → rpc → response update', async () => {
    vi.spyOn(draftMod, 'ensureDraftBundle').mockResolvedValue(
      ok({ applicationId: null, responseId: 'resp-1', valueByFieldId: {} })
    );
    vi.spyOn(draftMod, 'persistDraftValues').mockResolvedValue(ok(undefined));

    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (t === 'base_form_registration_type') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { registration_type_id: 'rt-1' },
            error: null,
          }),
        };
      }
      if (t === 'core_form_responses') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const rpc = vi.fn().mockResolvedValue({ data: 'app-new', error: null });
    const client = { from, rpc } as never;

    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: { x: '1' },
    });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.applicationId).toBe('app-new');
      expect(r.data.responseId).toBe('resp-1');
    }
    expect(rpc).toHaveBeenCalledWith(
      'app_base_application_create',
      expect.objectContaining({
        p_person_id: 'p1',
        p_form_response_id: 'resp-1',
        p_user_id: 'u1',
      })
    );

    vi.restoreAllMocks();
  });

  it('returns PARTIAL_PERSISTENCE when RPC ok but response update fails', async () => {
    vi.spyOn(draftMod, 'ensureDraftBundle').mockResolvedValue(
      ok({ applicationId: null, responseId: 'resp-1', valueByFieldId: {} })
    );
    vi.spyOn(draftMod, 'persistDraftValues').mockResolvedValue(ok(undefined));

    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (t === 'base_form_registration_type') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { registration_type_id: 'rt-1' },
            error: null,
          }),
        };
      }
      if (t === 'core_form_responses') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
          }),
        };
      }
      return {};
    });

    const client = {
      from,
      rpc: vi.fn().mockResolvedValue({ data: 'app-x', error: null }),
    } as never;

    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PARTIAL_PERSISTENCE');

    vi.restoreAllMocks();
  });

  it('maps RPC failure to DUPLICATE_SUBMIT_PREVENTED when message indicates duplicate', async () => {
    vi.spyOn(draftMod, 'ensureDraftBundle').mockResolvedValue(
      ok({ applicationId: null, responseId: 'resp-1', valueByFieldId: {} })
    );
    vi.spyOn(draftMod, 'persistDraftValues').mockResolvedValue(ok(undefined));

    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (t === 'base_form_registration_type') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { registration_type_id: 'rt-1' },
            error: null,
          }),
        };
      }
      return {};
    });

    const client = {
      from,
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      }),
    } as never;

    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('DUPLICATE_SUBMIT_PREVENTED');

    vi.restoreAllMocks();
  });

  it('returns PROXY_RESOLUTION_FAILED when acting user id is blank', async () => {
    const r = await submitEventApplication({
      client: {} as never,
      actingUserId: '',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PROXY_RESOLUTION_FAILED');
  });

  it('returns RESPONSE_PERSISTENCE_FAILED when persistDraftValues fails', async () => {
    vi.spyOn(draftMod, 'ensureDraftBundle').mockResolvedValue(
      ok({ applicationId: null, responseId: 'resp-1', valueByFieldId: {} })
    );
    vi.spyOn(draftMod, 'persistDraftValues').mockResolvedValue(
      err({ code: 'DRAFT_VALUE_INSERT', message: 'Could not save row.' })
    );

    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const r = await submitEventApplication({
      client: { from, rpc: vi.fn() } as never,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('RESPONSE_PERSISTENCE_FAILED');

    vi.restoreAllMocks();
  });

  it('returns APPLICATION_RPC_FAILED on generic RPC failure', async () => {
    vi.spyOn(draftMod, 'ensureDraftBundle').mockResolvedValue(
      ok({ applicationId: null, responseId: 'resp-1', valueByFieldId: {} })
    );
    vi.spyOn(draftMod, 'persistDraftValues').mockResolvedValue(ok(undefined));

    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (t === 'base_form_registration_type') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { registration_type_id: 'rt-1' },
            error: null,
          }),
        };
      }
      return {};
    });

    const client = {
      from,
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied for relation' } }),
    } as never;

    const r = await submitEventApplication({
      client,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('APPLICATION_RPC_FAILED');

    vi.restoreAllMocks();
  });

  it('returns APPLICATION_RPC_FAILED when legacy base_application draft row exists', async () => {
    const from = vi.fn((t: string) => {
      if (t === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'app-draft', status: 'draft' },
            error: null,
          }),
        };
      }
      return {};
    });

    const r = await submitEventApplication({
      client: { from, rpc: vi.fn() } as never,
      actingUserId: 'u1',
      applicantPersonId: 'p1',
      organisationId: 'o1',
      eventId: 'ev1',
      formId: 'form-1',
      fieldRows: [],
      formValues: {},
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('APPLICATION_RPC_FAILED');

    vi.restoreAllMocks();
  });
});

describe('fetchRegistrationTypeIdForForm', () => {
  it('returns VALIDATION_FAILED when binding query errors', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'timeout' },
      }),
    }));
    const r = await fetchRegistrationTypeIdForForm({ from } as never, 'form-1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns VALIDATION_FAILED when no registration type is bound', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }));
    const r = await fetchRegistrationTypeIdForForm({ from } as never, 'form-1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns registration type id when binding exists', async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { registration_type_id: 'rt-99' },
        error: null,
      }),
    }));
    const r = await fetchRegistrationTypeIdForForm({ from } as never, 'form-1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe('rt-99');
  });
});
