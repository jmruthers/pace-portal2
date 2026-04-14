import { useCallback, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { PaceFooter, PaceMain, PaceMainProvider } from '@solvera/pace-core/components';
import { APP_NAME } from '@/constants';
import { useAvailableApps } from '@/shared/hooks/useAvailableApps';
import { PasswordChangeDialog } from '@/shared/components/PasswordChangeDialog';
import { PortalPaceHeader } from '@/shared/components/PortalPaceHeader';
import { PORTAL_NAV_ITEMS } from '@/shared/components/portalNav';

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

export function PortalAuthenticatedLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useUnifiedAuthContext();
  const { data: appSwitcherItems } = useAvailableApps();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const fullName = useMemo(() => displayNameFromUser(user), [user]);
  const email = user?.email ?? '';

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [navigate, signOut]);

  return (
    <PaceMainProvider>
      <PortalPaceHeader
        appName={APP_NAME}
        logoHref="/"
        navItems={PORTAL_NAV_ITEMS}
        appSwitcherItems={appSwitcherItems}
        userFullName={fullName}
        userEmail={email}
        onUserMenuSignOut={handleSignOut}
        onUserMenuChangePassword={() => setPasswordOpen(true)}
      />
      <PaceMain>
        <Outlet />
      </PaceMain>
      <PaceFooter />
      <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </PaceMainProvider>
  );
}
