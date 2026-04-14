import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { PaceFooter, PaceMain, PaceMainProvider, UserMenu } from '@solvera/pace-core/components';
import { APP_NAME } from '@/constants';
import { PasswordChangeDialog } from '@/shared/components/PasswordChangeDialog';

function displayNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
  email?: string;
} | null): string {
  if (user == null) return '';
  const meta = user.user_metadata;
  const full =
    meta != null && typeof meta.full_name === 'string'
      ? meta.full_name
      : meta != null && typeof meta.name === 'string'
        ? meta.name
        : '';
  return full.trim() !== '' ? full : (user.email ?? '');
}

/**
 * Navigation-free authenticated shell for profile completion (no AppSwitcher, no main nav).
 */
export function ProfileCompleteLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, signOut } = useUnifiedAuthContext();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const fullName = useMemo(() => displayNameFromUser(user), [user]);
  const email = user?.email ?? '';
  const appSlug = APP_NAME.toLowerCase();
  const appLogoNarrowPath = `/logos/${appSlug}_favicon.svg`;
  const appLogoWidePath = `/logos/${appSlug}_logo_wide.svg`;

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [navigate, signOut]);

  return (
    <PaceMainProvider>
      <header className="border-b border-main-300 bg-main-100" role="banner">
        <nav
          aria-label="Profile completion"
          className="mx-auto grid w-full max-w-(--app-width) grid-cols-[auto_1fr_auto] items-center gap-0 px-4 py-3"
        >
          <Link
            to="/"
            className="inline-grid h-9 w-auto rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
            aria-label={`${APP_NAME} home`}
          >
            <img src={appLogoNarrowPath} alt="" className="h-9 w-9 md:hidden" />
            <img src={appLogoWidePath} alt="" className="hidden h-9 w-auto md:inline-grid" />
          </Link>
          <span />
          <UserMenu
            fullName={fullName}
            email={email}
            onSignOut={handleSignOut}
            onChangePassword={() => setPasswordOpen(true)}
            className="justify-self-end"
          />
        </nav>
      </header>
      <PaceMain>{children}</PaceMain>
      <PaceFooter />
      <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </PaceMainProvider>
  );
}
