import { Link } from 'react-router-dom';

/** Self-service registration placeholder (PR04). */
export function RegistrationPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4">
      <h1>Create account</h1>
      <p>Self-service registration will be implemented in PR04.</p>
      <p>
        <Link to="/login">Back to sign in</Link>
      </p>
    </main>
  );
}
