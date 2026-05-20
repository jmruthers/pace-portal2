import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { searchJoinableOrganisations } from '@/lib/searchJoinableOrganisations';

describe('searchJoinableOrganisations', () => {
  it('parses RPC rows', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'org-1', name: 'Org', display_name: 'Org Display' }],
      error: null,
    });
    const res = await searchJoinableOrganisations({ rpc } as never, 'scout');
    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.data[0].displayName).toBe('Org Display');
    }
    expect(rpc).toHaveBeenCalledWith('data_pace_joinable_organisations_search', {
      p_query: 'scout',
      p_limit: 20,
    });
  });
});
