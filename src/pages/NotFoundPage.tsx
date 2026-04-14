import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-(--app-width) place-content-center gap-4 p-4">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <Link to="/">Go to dashboard</Link>
      </p>
    </main>
  );
}
