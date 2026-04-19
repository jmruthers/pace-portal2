import { afterEach, describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loader';

describe('loadGoogleMapsWithPlaces', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());
  });

  it('skips when the API key is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    const r = await loadGoogleMapsWithPlaces();
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ status: 'skipped', reason: 'no_api_key' });
    }
  });

  it('returns loaded when maps is already on window', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'k');
    window.google = { maps: {} };
    const r = await loadGoogleMapsWithPlaces();
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ status: 'loaded' });
    }
  });

  it('injects a script and resolves when the script loads', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const el = node as HTMLScriptElement;
      queueMicrotask(() => {
        window.google = { maps: {} };
        el.dispatchEvent(new Event('load'));
      });
      return node;
    });

    const r = await loadGoogleMapsWithPlaces();
    appendSpy.mockRestore();
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ status: 'loaded' });
    }
  });

  it('reuses an in-flight script element', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'k2');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const script = document.createElement('script');
    script.dataset.paceGoogleMaps = 'true';
    document.head.appendChild(script);

    queueMicrotask(() => {
      window.google = { maps: {} };
      script.dispatchEvent(new Event('load'));
    });

    const r = await loadGoogleMapsWithPlaces();
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.data).toEqual({ status: 'loaded' });
    }
  });

  it('returns script load error when the injected script dispatches error', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'key-err');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const el = node as HTMLScriptElement;
      queueMicrotask(() => {
        el.dispatchEvent(new Event('error'));
      });
      return node;
    });

    const r = await loadGoogleMapsWithPlaces();
    appendSpy.mockRestore();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('GOOGLE_MAPS_SCRIPT_LOAD');
    }
  });

  it('returns init failed when the script loads but google.maps never appears (new script)', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'key-nomaps');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const el = node as HTMLScriptElement;
      queueMicrotask(() => {
        el.dispatchEvent(new Event('load'));
      });
      return node;
    });

    const r = await loadGoogleMapsWithPlaces();
    appendSpy.mockRestore();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('GOOGLE_MAPS_INIT_FAILED');
    }
  });

  it('returns init failed when an existing script loads without google.maps', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'key-existing');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const script = document.createElement('script');
    script.dataset.paceGoogleMaps = 'true';
    document.head.appendChild(script);

    queueMicrotask(() => {
      script.dispatchEvent(new Event('load'));
    });

    const r = await loadGoogleMapsWithPlaces();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('GOOGLE_MAPS_INIT_FAILED');
    }
  });

  it('returns script load error when an existing script dispatches error', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'key-existing-err');
    delete window.google;
    document.querySelectorAll('script[data-pace-google-maps]').forEach((el) => el.remove());

    const script = document.createElement('script');
    script.dataset.paceGoogleMaps = 'true';
    document.head.appendChild(script);

    queueMicrotask(() => {
      script.dispatchEvent(new Event('error'));
    });

    const r = await loadGoogleMapsWithPlaces();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('GOOGLE_MAPS_SCRIPT_LOAD');
    }
  });
});
