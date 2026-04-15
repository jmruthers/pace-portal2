import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveRbacAppIdForSetup', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('returns null when app name does not match APP_NAME', async () => {
    const { resolveRbacAppIdForSetup } = await import('@/lib/rbacResolveAppId');
    const client = {} as never;
    await expect(resolveRbacAppIdForSetup(client, 'other')).resolves.toBeNull();
  });

  it('returns app_id from data_app_resolve when Supabase is configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const rpc = vi.fn().mockResolvedValue({ data: [{ app_id: 'rid-1' }], error: null });
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const client = { auth: { getSession }, rpc } as never;
    const { resolveRbacAppIdForSetup } = await import('@/lib/rbacResolveAppId');
    await expect(resolveRbacAppIdForSetup(client, 'pace')).resolves.toBe('rid-1');
    expect(rpc).toHaveBeenCalledWith('data_app_resolve', { p_app_name: 'pace', p_user_id: 'user-1' });
  });
});
