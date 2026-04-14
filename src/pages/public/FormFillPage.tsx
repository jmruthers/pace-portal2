import { useUnifiedAuthContext } from '@solvera/pace-core';

export interface FormFillPageProps {
  eventSlug: string;
  formSlug: string;
}

/**
 * Public landing vs authenticated form branch (PR14–PR16); PR01 shell placeholder.
 * Not wrapped in PagePermissionGuard (see PR00 route model for `/:eventSlug/:formSlug`).
 */
export function FormFillPage({ eventSlug, formSlug }: FormFillPageProps) {
  const { isAuthenticated } = useUnifiedAuthContext();

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>Event form</h1>
      <p>
        Event {eventSlug} — form {formSlug}
      </p>
      {isAuthenticated ? (
        <p>Authenticated form experience will load here when signed in.</p>
      ) : (
        <p>Public landing: sign in to continue (handoff in PR14).</p>
      )}
    </main>
  );
}
