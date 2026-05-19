import { describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { fetchOrgFormBySlug } from '@/lib/fetchOrgFormBySlug';
import type { Database } from '@/types/pace-database';

type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

function buildFormRow(over: Partial<CoreFormRow> = {}): CoreFormRow {
  return {
    id: 'form-1',
    organisation_id: 'org-1',
    event_id: null,
    slug: 'staff-onboarding',
    status: 'published',
    access_mode: 'authenticated_member',
    is_active: true,
    opens_at: null,
    closes_at: null,
    name: 'Staff onboarding',
    title: 'Staff onboarding',
    description: null,
    workflow_type: 'generic',
    workflow_config: {},
    sort_order: null,
    created_at: null,
    updated_at: null,
    created_by: null,
    updated_by: null,
    deleted_at: null,
    ...over,
  } as CoreFormRow;
}

function makeChain(end: Record<string, unknown>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  Object.assign(chain, end);
  return chain;
}

describe('fetchOrgFormBySlug', () => {
  it('returns FORM_LOAD_CONTEXT when secure client is missing', async () => {
    const r = await fetchOrgFormBySlug(null, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_LOAD_CONTEXT');
  });

  it('returns FORM_LOAD_CONTEXT when organisationId is empty', async () => {
    const r = await fetchOrgFormBySlug({} as never, '', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_LOAD_CONTEXT');
  });

  it('returns FORM_NOT_FOUND for blank slug', async () => {
    const r = await fetchOrgFormBySlug({} as never, 'org-1', ['org-1'], '   ');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_NOT_FOUND');
  });

  it('returns FORM_LOAD_QUERY when core_forms query errors', async () => {
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    });
    const client = { from: vi.fn(() => formsChain) } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_LOAD_QUERY');
  });

  it('returns FORM_NOT_FOUND when no published row matches', async () => {
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const client = { from: vi.fn(() => formsChain) } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_NOT_FOUND');
  });

  it('returns FORM_NOT_FOUND when resolved form organisation is outside membership', async () => {
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ organisation_id: 'other-org' }),
        error: null,
      }),
    });
    const client = { from: vi.fn(() => formsChain) } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_NOT_FOUND');
  });

  it('returns FORM_ACCESS_MODE when access_mode is not authenticated_member', async () => {
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ access_mode: 'public' }),
        error: null,
      }),
    });
    const client = { from: vi.fn(() => formsChain) } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_ACCESS_MODE');
  });

  it('returns FORM_INACTIVE when form is not active', async () => {
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ is_active: false }),
        error: null,
      }),
    });
    const client = { from: vi.fn(() => formsChain) } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_INACTIVE');
  });

  it('returns FORM_WINDOW_CLOSED when opens_at is in the future', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ opens_at: future }),
        error: null,
      }),
    });
    const fieldsChain = makeChain({});
    fieldsChain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = {
      from: vi.fn((t: string) => (t === 'core_forms' ? formsChain : fieldsChain)),
    } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_WINDOW_CLOSED');
  });

  it('returns FORM_WINDOW_CLOSED when closes_at is in the past', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ closes_at: past }),
        error: null,
      }),
    });
    const fieldsChain = makeChain({});
    fieldsChain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = {
      from: vi.fn((t: string) => (t === 'core_forms' ? formsChain : fieldsChain)),
    } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_WINDOW_CLOSED');
  });

  it('returns ok with field rows when eligible org form resolves', async () => {
    const formRow = buildFormRow();
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: formRow, error: null }),
    });
    const fieldsChain = makeChain({});
    fieldsChain.order = vi.fn().mockResolvedValue({
      data: [{ id: 'fld-1', form_id: formRow.id, is_active: true, sort_order: 0 }],
      error: null,
    });
    const client = {
      from: vi.fn((t: string) => (t === 'core_forms' ? formsChain : fieldsChain)),
    } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff-onboarding');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.form.id).toBe(formRow.id);
      expect(r.data.fieldRows).toHaveLength(1);
      expect(Array.isArray(r.data.confirmationKeys)).toBe(true);
    }
  });

  it('uses organisation_id in filter when only one accessible org is provided', async () => {
    const formRow = buildFormRow();
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: formRow, error: null }),
    });
    const fieldsChain = makeChain({});
    fieldsChain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = {
      from: vi.fn((t: string) => (t === 'core_forms' ? formsChain : fieldsChain)),
    } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', [], 'staff-onboarding');
    expect(isOk(r)).toBe(true);
    expect(formsChain.eq).toHaveBeenCalledWith('organisation_id', 'org-1');
  });

  it('returns FORM_LOAD_QUERY when field load fails', async () => {
    const formRow = buildFormRow();
    const formsChain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: formRow, error: null }),
    });
    const fieldsChain = makeChain({});
    fieldsChain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'fields broke' },
    });
    const client = {
      from: vi.fn((t: string) => (t === 'core_forms' ? formsChain : fieldsChain)),
    } as never;
    const r = await fetchOrgFormBySlug(client, 'org-1', ['org-1'], 'staff-onboarding');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('FORM_LOAD_QUERY');
  });
});
