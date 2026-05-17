export type ShellNavigate = (to: string, options?: { replace?: boolean }) => void;

/**
 * Shell navigation when Supabase auth reports sign-out (idle timeout, explicit sign-out, session expiry).
 */
export function applyShellSignedOutRedirect(
  pathname: string,
  navigate: ShellNavigate
): void {
  if (pathname === '/login' || pathname === '/register') {
    return;
  }
  navigate('/login', { replace: true });
}
