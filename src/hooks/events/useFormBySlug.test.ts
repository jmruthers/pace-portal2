import { describe, expect, it, vi } from 'vitest';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { isErr, isOk } from '@solvera/pace-core/types';
import { fetchFormBySlug } from '@/hooks/events/useFormBySlug';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

type ThenResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function createThenableBuilder<T>(result: ThenResult<T>): unknown {
  const builder = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (v: ThenResult<T>) => unknown) => Promise.resolve(result).then(onFulfilled);
        }
        return vi.fn(() => builder);
      },
    }
  );
  return builder;
}

const eventRow = {
  event_id: 'ev1',
  event_code: 'camp',
  organisation_id: 'o1',
  event_name: 'Camp',
  event_date: '2026-06-01',
  registration_scope: 'camp',
  is_visible: true,
  public_readable: true,
} as const;

const publishedForm = {
  id: 'form-1',
  slug: 'reg',
  name: 'Registration',
  title: 'Registration',
  description: 'Desc',
  event_id: 'ev1',
  organisation_id: 'o1',
  status: 'published',
  is_active: true,
  access_mode: 'authenticated_member',
  workflow_type: 'base_registration',
  workflow_config: {},
  opens_at: null,
  closes_at: null,
  is_primary_entrypoint: true,
  sort_order: 1,
} as const;

function sampleFieldRows(): CoreFormFieldRow[] {
  return [
    {
      id: 'field-1',
      form_id: 'form-1',
      organisation_id: 'o1',
      field_key: 'person.first_name',
      field_label: 'First',
      sort_order: 1,
      is_active: true,
      is_required: true,
      display_options: null,
      validation_rules: null,
      created_at: null,
      updated_at: null,
    } as CoreFormFieldRow,
  ];
}

describe('fetchFormBySlug', () => {
  it('resolves form by explicit slug', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          return createThenableBuilder({ data: publishedForm, error: null });
        }
        if (table === 'core_form_fields') {
          return createThenableBuilder({ data: sampleFieldRows(), error: null });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown table' } });
      }),
    };

    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'camp',
      'reg'
    );
    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.data.form.slug).toBe('reg');
      expect(res.data.fieldRows).toHaveLength(1);
    }
  });

  it('resolves primary entrypoint when formSlug is null', async () => {
    let formsCall = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          formsCall += 1;
          return createThenableBuilder({ data: publishedForm, error: null });
        }
        if (table === 'core_form_fields') {
          return createThenableBuilder({ data: sampleFieldRows(), error: null });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown' } });
      }),
    };

    const res = await fetchFormBySlug(client as unknown as RBACSupabaseClient, 'o1', ['o1'], 'camp', null);
    expect(formsCall).toBe(1);
    expect(isOk(res)).toBe(true);
  });

  it('returns EVENT_NOT_FOUND when slug is reserved', async () => {
    const client = { from: vi.fn() };
    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'dashboard',
      'reg'
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe('EVENT_NOT_FOUND');
    }
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns FORM_NOT_FOUND when published form row is missing', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          return createThenableBuilder({ data: null, error: null });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown' } });
      }),
    };

    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'camp',
      'missing'
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe('FORM_NOT_FOUND');
    }
  });

  it('returns FORM_ACCESS_MODE when access_mode is not authenticated_member', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          return createThenableBuilder({
            data: { ...publishedForm, access_mode: 'public' },
            error: null,
          });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown' } });
      }),
    };

    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'camp',
      'reg'
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe('FORM_ACCESS_MODE');
    }
  });

  it('returns FORM_INACTIVE when form is inactive', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          return createThenableBuilder({
            data: { ...publishedForm, is_active: false },
            error: null,
          });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown' } });
      }),
    };

    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'camp',
      'reg'
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe('FORM_INACTIVE');
    }
  });

  it('returns FORM_WINDOW_CLOSED when opens_at is in the future', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_events') {
          return createThenableBuilder({ data: eventRow, error: null });
        }
        if (table === 'core_forms') {
          return createThenableBuilder({
            data: { ...publishedForm, opens_at: '2099-01-01T00:00:00.000Z' },
            error: null,
          });
        }
        return createThenableBuilder({ data: null, error: { message: 'unknown' } });
      }),
    };

    const res = await fetchFormBySlug(
      client as unknown as RBACSupabaseClient,
      'o1',
      ['o1'],
      'camp',
      'reg'
    );
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe('FORM_WINDOW_CLOSED');
    }
  });
});
