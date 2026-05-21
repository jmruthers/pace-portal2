import { useEffect, useState } from 'react';
import { loadGoogleMapsWithPlaces } from '@/integrations/google-maps/loader';

export const PROFILE_WIZARD_STEP_COUNT = 3;

export const PROFILE_WIZARD_STEP_LABELS = [
  'Personal details',
  'Contact details',
  'Membership details',
] as const;

export type ProfileWizardSaveStatus = 'idle' | 'saving' | 'error' | 'success';

export type GoogleMapsPreloadState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; result: Awaited<ReturnType<typeof loadGoogleMapsWithPlaces>> };

export function useGoogleMapsPreloadForWizard(): GoogleMapsPreloadState {
  const [mapsPreload, setMapsPreload] = useState<GoogleMapsPreloadState>(() => ({ phase: 'loading' }));
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadGoogleMapsWithPlaces();
      if (!cancelled) {
        setMapsPreload({ phase: 'ready', result });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return mapsPreload;
}

export function combineWizardShellLoading(
  referenceLoading: boolean,
  personLoading: boolean,
  personId: string | null,
  phonesLoading: boolean,
  addressLoading: boolean,
  hasAddressIds: boolean
): boolean {
  return Boolean(
    referenceLoading ||
      personLoading ||
      (personId != null && phonesLoading) ||
      (hasAddressIds && addressLoading)
  );
}

export function combineWizardShellError(
  referenceError: boolean,
  personError: boolean,
  phonesError: boolean,
  addressError: boolean,
  refErr: unknown,
  personErr: unknown,
  phonesErr: unknown,
  addressErr: unknown
): unknown | null {
  if (!referenceError && !personError && !phonesError && !addressError) {
    return null;
  }
  return refErr ?? personErr ?? phonesErr ?? addressErr;
}
