import { describe, expect, it, afterEach, vi } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('isSupabaseConfigured is true when URL and publishable key are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const { isSupabaseConfigured } = await import('./env');
    expect(isSupabaseConfigured).toBe(true);
  });
});
