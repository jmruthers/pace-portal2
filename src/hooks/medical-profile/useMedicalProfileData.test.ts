import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import * as supabaseTyped from '@/lib/supabase-typed';
import { fetchMedicalProfileData } from '@/hooks/medical-profile/useMedicalProfileData';

const profileRpcRow = {
  access_level: 'read',
  id: 'mp1',
  person_id: 'p1',
  carer_name: '',
  data_retention_until: '',
  dietary_comments: '',
  has_carer: false,
  has_dietary_requirements: false,
  health_care_card_expiry: '',
  health_care_card_number: '',
  health_fund_name: '',
  health_fund_number: '',
  is_fully_immunised: false,
  last_tetanus_date: '',
  medicare_expiry: '',
  medicare_number: '',
  menu_selection: '',
  requires_support: false,
  support_details: '',
};

function buildClient() {
  const rpc = vi.fn((name: string, args: { p_member_id?: string }) => {
    if (name === 'data_medi_profile_get') {
      expect(args.p_member_id).toBe('m1');
      return Promise.resolve({ data: [profileRpcRow], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const from = vi.fn((table: string) => {
    if (table === 'core_member') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { person_id: 'p1' }, error: null }),
      };
    }
    if (table === 'medi_condition') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'c1',
              name: 'Asthma',
              custom_name: null,
              severity: 'High',
              medical_alert: true,
              is_active: true,
            },
          ],
          error: null,
        }),
      };
    }
    return {};
  });

  return { from, rpc } as never;
}

describe('fetchMedicalProfileData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns err when client is missing', async () => {
    const r = await fetchMedicalProfileData(null, 'm1', 'org-1');
    expect(isOk(r)).toBe(false);
  });

  it('loads profile via RPC and condition summary', async () => {
    vi.spyOn(supabaseTyped, 'toTypedSupabase').mockReturnValue(buildClient());

    const r = await fetchMedicalProfileData({} as RBACSupabaseClient, 'm1', 'org-1');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data.profile?.id).toBe('mp1');
      expect(r.data.conditions).toHaveLength(1);
      expect(r.data.conditions[0]?.name).toBe('Asthma');
    }
  });
});
