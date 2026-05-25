import { describe, expect, it, vi } from 'vitest';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import { runRpcWithOrganisationContext } from '@/lib/submissionOrganisationContext';

describe('runRpcWithOrganisationContext', () => {
  it('sets context on the base client before running the target RPC', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: 'app-1', error: null });
    const base = { rpc };
    const client = { _base: base };

    await runRpcWithOrganisationContext(
      client as unknown as RBACSupabaseClient,
      'org-event',
      'ev-1',
      'app_base_application_create',
      { p_event_id: 'ev-1' }
    );

    expect(rpc).toHaveBeenNthCalledWith(1, 'set_organisation_context', {
      p_organisation_id: 'org-event',
      p_event_id: 'ev-1',
      p_app_id: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'app_base_application_create', { p_event_id: 'ev-1' });
  });
});
