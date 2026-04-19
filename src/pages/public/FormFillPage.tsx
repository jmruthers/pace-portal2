import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';

export interface FormFillPageProps {
  eventSlug: string;
  formSlug: string;
}

/**
 * Public landing vs authenticated form branch (PR14–PR16); PR01 auth-required handoff when no session.
 */
export function FormFillPage({ eventSlug, formSlug }: FormFillPageProps) {
  const { isAuthenticated } = useUnifiedAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) return;
    if (location.pathname.startsWith('/login')) return;
    const returnTo = `${location.pathname}${location.search}`;
    const login = `/login?redirect=${encodeURIComponent(returnTo)}`;
    navigate(login, { replace: true });
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>Event form</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <h1>Event form</h1>
      <p>
        Event {eventSlug} — form {formSlug}
      </p>
      <p>Authenticated form experience will load here when signed in.</p>
    </main>
  );
}
