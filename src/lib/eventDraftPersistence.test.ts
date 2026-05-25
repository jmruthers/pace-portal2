import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { ensureDraftBundle } from '@/lib/eventDraftPersistence';

describe('eventDraftPersistence', () => {
  it('ensureDraftBundle calls app_portal_form_response_ensure_draft and loads values', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        response_id: 'resp-1',
        organisation_id: 'org-event',
        created: false,
      },
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'core_form_response_values') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ form_field_id: 'field-1', value_text: 'saved', value_json: null }],
            error: null,
          }),
        };
      }
      return {};
    });

    const r = await ensureDraftBundle(
      { from, rpc } as never,
      'person-1',
      'ev-1',
      'form-1'
    );

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.responseId).toBe('resp-1');
      expect(r.data.writeOrganisationId).toBe('org-event');
      expect(r.data.valueByFieldId['field-1']).toBe('saved');
    }
    expect(rpc).toHaveBeenCalledWith('app_portal_form_response_ensure_draft', {
      p_form_id: 'form-1',
      p_event_id: 'ev-1',
      p_applicant_person_id: 'person-1',
    });
  });

  it('ensureDraftBundle rejects when ensure_draft returns submitted status', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        response_id: 'resp-sub',
        organisation_id: 'org-event',
        created: false,
        status: 'submitted',
        application_id: 'app-1',
      },
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === 'base_application') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const r = await ensureDraftBundle({ from, rpc } as never, 'person-1', 'ev-1', 'form-1');
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) {
      expect(r.error.code).toBe('APPLICATION_ALREADY_SUBMITTED');
      expect(r.error.message).toMatch(/already submitted/i);
    }
  });
});
