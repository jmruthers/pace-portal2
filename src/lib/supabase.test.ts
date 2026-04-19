import { describe, expect, it, vi, afterEach } from 'vitest';

const rpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc,
  })),
}));

describe('supabase bootstrap + event lookup', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    rpc.mockReset();
  });

  it('hasSupabaseBrowserConfig is false when env keys are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { hasSupabaseBrowserConfig, fetchEventExistsWithCaseFallback } = await import('./supabase');
    expect(hasSupabaseBrowserConfig()).toBe(false);

    const r = await fetchEventExistsWithCaseFallback('EVT', 'u1', 'o1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('SUPABASE_NOT_CONFIGURED');
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fetchEventExistsWithCaseFallback returns rpc result when configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk-test');
    rpc.mockResolvedValue({ data: [{ id: '1' }], error: null });

    const { fetchEventExistsWithCaseFallback } = await import('./supabase');
    const r = await fetchEventExistsWithCaseFallback('MyEvent', 'user-1', 'org-1');

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBe(true);
    }
    expect(rpc).toHaveBeenCalledWith('data_event_get_by_code', {
      p_event_code: 'MyEvent',
      p_user_id: 'user-1',
      p_organisation_id: 'org-1',
    });
  });

  it('retries with lowercase event code when first lookup has no rows', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk-test');
    rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

    const { fetchEventExistsWithCaseFallback } = await import('./supabase');
    const r = await fetchEventExistsWithCaseFallback('MixedCase', null, null);

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBe(true);
    }
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith('data_event_get_by_code', {
      p_event_code: 'mixedcase',
      p_user_id: undefined,
      p_organisation_id: undefined,
    });
  });

  it('returns EVENT_CODE_LOOKUP when rpc returns an error', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk-test');
    rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    const { fetchEventExistsWithCaseFallback } = await import('./supabase');
    const r = await fetchEventExistsWithCaseFallback('evt', 'u', 'o');

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('EVENT_CODE_LOOKUP');
    }
  });

  it('does not retry lowercase when code is already lowercase', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk-test');
    rpc.mockResolvedValue({ data: [], error: null });

    const { fetchEventExistsWithCaseFallback } = await import('./supabase');
    const r = await fetchEventExistsWithCaseFallback('low', 'u', 'o');

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBe(false);
    }
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
