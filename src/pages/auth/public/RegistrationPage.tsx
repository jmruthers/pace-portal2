import { Navigate, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@solvera/pace-core/components';

/**
 * Public self-service account creation entry (placeholder, PR04).
 * Lives under `auth/public/` so the route stays a deliberately unguarded public surface.
 * Does not read event or form query params; no sign-up or bootstrap logic.
 */
export function RegistrationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, sessionRestoration } = useUnifiedAuthContext();

  if (isLoading || sessionRestoration.isRestoring) {
    return (
      <main className="grid min-h-screen place-items-center px-4" aria-busy="true">
        <section className="grid place-items-center gap-4">
          <LoadingSpinner label="Loading…" />
        </section>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p>
            Self-service PACE account creation will be available here in a future release. This page
            does not collect credentials or create accounts yet.
          </p>
        </CardContent>
        <CardFooter className="text-right">
          <Button type="button" variant="default" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
