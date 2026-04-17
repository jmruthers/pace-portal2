/**
 * Loads Google Maps JavaScript API with Places when a browser API key is configured.
 * PR05 shell preloads optionally; PR06 owns address field behaviour.
 */

import { err, ok, type ApiResult } from '@solvera/pace-core/types';

/** Successful outcomes (loaded, or intentionally skipped when no key). */
export type GoogleMapsWithPlacesData =
  | { status: 'loaded' }
  | { status: 'skipped'; reason: 'no_api_key' };

export type LoadGoogleMapsWithPlacesResult = ApiResult<GoogleMapsWithPlacesData>;

declare global {
  interface Window {
    google?: { maps?: unknown };
  }
}

function readMapsApiKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

function waitForScript(el: HTMLScriptElement): Promise<ApiResult<void>> {
  return new Promise((resolve) => {
    el.addEventListener('load', () => resolve(ok(undefined)), { once: true });
    el.addEventListener(
      'error',
      () =>
        resolve(
          err({
            code: 'GOOGLE_MAPS_SCRIPT_LOAD',
            message: 'Google Maps script failed to load.',
          })
        ),
      { once: true }
    );
  });
}

/**
 * Injects the Maps script once and resolves when `window.google.maps` is available.
 */
export async function loadGoogleMapsWithPlaces(): Promise<LoadGoogleMapsWithPlacesResult> {
  const apiKey = readMapsApiKey();
  if (apiKey === '') {
    return ok({ status: 'skipped', reason: 'no_api_key' });
  }

  if (typeof window.google?.maps !== 'undefined') {
    return ok({ status: 'loaded' });
  }

  const existing = document.querySelector<HTMLScriptElement>('script[data-pace-google-maps]');
  if (existing) {
    const waited = await waitForScript(existing);
    if (!waited.ok) {
      return waited;
    }
    if (typeof window.google?.maps !== 'undefined') {
      return ok({ status: 'loaded' });
    }
    return err({
      code: 'GOOGLE_MAPS_INIT_FAILED',
      message: 'Google Maps API did not initialise.',
    });
  }

  const script = document.createElement('script');
  script.dataset.paceGoogleMaps = 'true';
  script.async = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
  document.head.appendChild(script);

  const waited = await waitForScript(script);
  if (!waited.ok) {
    return waited;
  }

  if (typeof window.google?.maps !== 'undefined') {
    return ok({ status: 'loaded' });
  }
  return err({
    code: 'GOOGLE_MAPS_INIT_FAILED',
    message: 'Google Maps API did not initialise.',
  });
}
