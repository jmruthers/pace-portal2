import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/pace-database';
import * as formFieldDataModule from '@/hooks/events/useFormFieldData';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';

const { fetchFieldCatalogueAndPrefill } = formFieldDataModule;

function createThenableBuilder<T>(result: { data: T; error: { message?: string } | null }): unknown {
  const builder = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (v: typeof result) => unknown) => Promise.resolve(result).then(onFulfilled);
        }
        return vi.fn(() => builder);
      },
    }
  );
  return builder;
}

const fieldRows: CoreFormFieldRow[] = [
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

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
}));

vi.mock('@/lib/supabase-typed', () => ({
  toTypedSupabase: () => ({}) as never,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchFieldCatalogueAndPrefill', () => {
  it('returns prefill from core_person when RPC succeeds', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            table_name: 'core_person',
            field_name: 'first_name',
            field_type: 'text',
          },
        ],
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === 'core_person') {
          return createThenableBuilder({
            data: { first_name: 'Alex' },
            error: null,
          });
        }
        return createThenableBuilder({ data: null, error: { message: 'unexpected' } });
      }),
    } as unknown as SupabaseClient<Database>;

    const res = await fetchFieldCatalogueAndPrefill(client, fieldRows, 'p1', 'o1', 'ev1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.fieldDefaults['field-1']).toBe('Alex');
      expect(res.data.prefillWarning).toBeNull();
    }
  });

  it('surfaces non-fatal warning when catalogue RPC fails but still builds metas', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Catalogue unavailable' },
      }),
      from: vi.fn(() => createThenableBuilder({ data: null, error: null })),
    } as unknown as SupabaseClient<Database>;

    const res = await fetchFieldCatalogueAndPrefill(client, fieldRows, 'p1', 'o1', 'ev1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.prefillWarning).toMatch(/catalogue/i);
      expect(res.data.fieldMetas).toHaveLength(1);
    }
  });

  it('records lookup failures without failing the whole prefill', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn((table: string) => {
        if (table === 'core_person') {
          return createThenableBuilder({
            data: null,
            error: { message: 'nope' },
          });
        }
        return createThenableBuilder({ data: null, error: null });
      }),
    } as unknown as SupabaseClient<Database>;

    const res = await fetchFieldCatalogueAndPrefill(client, fieldRows, 'p1', 'o1', 'ev1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.prefillWarning).toMatch(/nope/);
    }
  });
});
