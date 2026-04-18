import { afterEach, describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loadGoogleMapsWithPlaces';

describe('loadGoogleMapsWithPlaces', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as unknown as { google?: unknown }).google;
  });

  it('returns err when API key is not configured', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    const r = await loadGoogleMapsWithPlaces();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.message).toMatch(/not configured/i);
    }
  });

  it('returns ok when Places is already available', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
    (globalThis as unknown as { google: { maps: { places: object } } }).google = {
      maps: { places: {} },
    };
    const r = await loadGoogleMapsWithPlaces();
    expect(isOk(r)).toBe(true);
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
    const r = await load();
    expect(isOk(r)).toBe(true);
    expect(appendSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });
});
