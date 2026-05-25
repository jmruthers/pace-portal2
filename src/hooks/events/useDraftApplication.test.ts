import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { ensureDraftBundle, persistDraftValues } from '@/lib/eventDraftPersistence';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

function fieldRow(id: string): CoreFormFieldRow {
  return {
    id,
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
  } as CoreFormFieldRow;
}

function responsesThenable(rows: unknown[]) {
  const resolution = { data: rows, error: null };
  const builder = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (onFulfilled: (v: typeof resolution) => unknown) =>
            Promise.resolve(resolution).then(onFulfilled);
        }
        return vi.fn(() => builder);
      },
    }
  );
  return builder;
}

describe('ensureDraftBundle', () => {
  it('returns draft bundle from ensure_draft RPC', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: { response_id: 'resp-1', organisation_id: 'org-event', created: true },
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === 'base_application') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'core_form_response_values') {
          return responsesThenable([
            { form_field_id: 'field-1', value_text: 'saved', value_json: null },
          ]);
        }
        return {};
      }),
    } as unknown as Client;

    const r = await ensureDraftBundle(client, 'p1', 'ev1', 'form-1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.applicationId).toBeNull();
      expect(r.data.responseId).toBe('resp-1');
      expect(r.data.writeOrganisationId).toBe('org-event');
      expect(r.data.valueByFieldId['field-1']).toBe('saved');
    }
  });
});

describe('persistDraftValues', () => {
  it('deletes then inserts per field row', async () => {
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const insert = vi.fn().mockResolvedValue({ error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_form_response_values') {
          return {
            select: vi.fn(() => responsesThenable([])),
            delete: del,
            insert,
          };
        }
        return {};
      }),
    } as unknown as Client;

    const r = await persistDraftValues(client, 'org-event', 'resp-1', [fieldRow('field-1')], {
      'field-1': 'next',
    });
    expect(isOk(r)).toBe(true);
    expect(del).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });

  it('deletes orphaned field ids missing from dynamic snapshot', async () => {
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const insert = vi.fn().mockResolvedValue({ error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'core_form_response_values') {
          return {
            select: vi.fn(() =>
              responsesThenable([{ form_field_id: 'gone' }, { form_field_id: 'stay' }])
            ),
            delete: del,
            insert,
          };
        }
        return {};
      }),
    } as unknown as Client;

    const r = await persistDraftValues(client, 'org-event', 'resp-1', [fieldRow('stay')], {
      stay: 'next',
    });
    expect(isOk(r)).toBe(true);
    expect(del).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
