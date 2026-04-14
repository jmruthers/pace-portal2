import { Link, useSearchParams } from 'react-router-dom';
import { PaceLoginPage } from '@solvera/pace-core/components';
import { APP_NAME } from '@/constants';

/**
 * Sign-in surface with link to registration (PR01).
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';

  return (
    <>
      <PaceLoginPage appName={APP_NAME} onSuccessRedirectPath={redirectTo} />
      <nav
        aria-label="Account creation"
        className="mx-auto grid w-full max-w-(--app-width) justify-items-center pb-8"
      >
        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </nav>
    </>
  );
}
