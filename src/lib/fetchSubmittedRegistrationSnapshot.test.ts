import { describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { fetchSubmittedRegistrationSnapshot } from '@/lib/fetchSubmittedRegistrationSnapshot';

function makeChain(end: Record<string, unknown>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  Object.assign(chain, end);
  return chain;
}

describe('fetchSubmittedRegistrationSnapshot', () => {
  it('returns FORM_LOAD_CONTEXT when typed client missing', async () => {
    const r = await fetchSubmittedRegistrationSnapshot(null as never, 'p1', 'ev1', 'form1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_LOAD_CONTEXT');
  });

  it('returns ok(null) when no base_application row', async () => {
    const appsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const client = { from: vi.fn(() => appsChain) } as never;
    const r = await fetchSubmittedRegistrationSnapshot(client, 'p1', 'ev1', 'form1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe(null);
  });

  it('returns ok(null) when application status is draft', async () => {
    const appsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'app-1', status: 'draft' },
        error: null,
      }),
    });
    const client = { from: vi.fn(() => appsChain) } as never;
    const r = await fetchSubmittedRegistrationSnapshot(client, 'p1', 'ev1', 'form1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe(null);
  });

  it('returns ok(null) when application status trimmed is empty treated as absent', async () => {
    const appsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'app-1', status: '   ' },
        error: null,
      }),
    });
    const client = { from: vi.fn(() => appsChain) } as never;
    const r = await fetchSubmittedRegistrationSnapshot(client, 'p1', 'ev1', 'form1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe(null);
  });

  it('returns RESPONSE_QUERY error when submitted response lookup fails', async () => {
    const appsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'app-1', status: 'submitted' },
        error: null,
      }),
    });
    const responsesChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc fail' } }),
    });
    const client = {
      from: vi.fn((t: string) => (t === 'base_application' ? appsChain : responsesChain)),
    } as never;
    const r = await fetchSubmittedRegistrationSnapshot(client, 'p1', 'ev1', 'form1');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('RESPONSE_QUERY');
  });

  it('returns ok with value map when chain succeeds', async () => {
    const appsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'app-sub', status: 'submitted' },
        error: null,
      }),
    });
    const responsesChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'resp-sub' },
        error: null,
      }),
    });
    const valuesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { form_field_id: 'f1', value_json: { zip: true }, value_text: null },
          { form_field_id: 'f2', value_json: null, value_text: 'txt' },
        ],
        error: null,
      }),
    };
    const client = {
      from: vi.fn((t: string) => {
        if (t === 'base_application') return appsChain;
        if (t === 'core_form_responses') return responsesChain;
        return valuesChain;
      }),
    } as never;
    const r = await fetchSubmittedRegistrationSnapshot(client, 'p1', 'ev1', 'form1');
    expect(isOk(r)).toBe(true);
    if (isOk(r) && r.data) {
      expect(r.data.applicationId).toBe('app-sub');
      expect(r.data.responseId).toBe('resp-sub');
      expect(r.data.valueByFieldId.f1).toEqual({ zip: true });
      expect(r.data.valueByFieldId.f2).toBe('txt');
    }
  });
});
