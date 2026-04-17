/**
 * Loads the Google Maps JavaScript API with the Places library (session token support in AddressField).
 * No-op resolve when `VITE_GOOGLE_MAPS_API_KEY` is unset — use manual address entry only.
 */
const SCRIPT_ID = 'pace-portal-google-maps-places';

let loadPromise: Promise<void> | null = null;

function hasPlaces(): boolean {
  return Boolean(
    (globalThis as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places
  );
}

export function loadGoogleMapsWithPlaces(): Promise<void> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key || key.trim() === '') {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in a browser.'));
  }
  if (hasPlaces()) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google Maps script failed.')));
        return;
      }
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps script failed to load.'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
