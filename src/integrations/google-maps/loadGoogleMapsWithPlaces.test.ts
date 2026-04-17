import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loadGoogleMapsWithPlaces';

describe('loadGoogleMapsWithPlaces', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as unknown as { google?: unknown }).google;
  });

  it('rejects when API key is not configured', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    await expect(loadGoogleMapsWithPlaces()).rejects.toThrow(/not configured/i);
  });

  it('resolves immediately when Places is already available', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
    (globalThis as unknown as { google: { maps: { places: object } } }).google = {
      maps: { places: {} },
    };
    await expect(loadGoogleMapsWithPlaces()).resolves.toBeUndefined();
  });

  it('appends a script tag when key is set and API is not loaded', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
    delete (globalThis as unknown as { google?: unknown }).google;
    const existing = document.getElementById('pace-portal-google-maps-places');
    existing?.remove();

    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      queueMicrotask(() => {
        (node as HTMLScriptElement).onload?.(new Event('load'));
      });
      return node;
    });

    const { loadGoogleMapsWithPlaces: load } = await import(
      '@/integrations/google-maps/loadGoogleMapsWithPlaces'
    );
    await expect(load()).resolves.toBeUndefined();
    expect(appendSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });
});
