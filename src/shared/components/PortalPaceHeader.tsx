/**
 * PaceHeader fork: passes `items` into AppSwitcher for access-aware app lists (PR01).
 * Upstream PaceHeader does not expose app switcher items; tracked for pace-core alignment.
 */
import {
  AppSwitcher,
  ContextSelector,
  NavigationMenu,
  UserMenu,
  type AppSwitcherItem,
  type NavigationItem,
} from '@solvera/pace-core/components';
import { Link, useInRouterContext } from 'react-router-dom';

export interface PortalPaceHeaderProps {
  logoHref?: string;
  logoSrc?: string;
  appName?: string;
  navItems?: NavigationItem[];
  appSwitcherItems?: AppSwitcherItem[];
  showContextSelector?: boolean;
  showOrganisations?: boolean;
  showEvents?: boolean;
  userFullName?: string;
  userEmail?: string;
  userAvatarSrc?: string | null;
  onUserMenuSignOut?: () => void;
  onUserMenuChangePassword?: () => void;
}

export function PortalPaceHeader({
  logoHref = '/',
  logoSrc,
  appName,
  navItems = [],
  appSwitcherItems,
  showContextSelector = false,
  showOrganisations = true,
  showEvents = false,
  userFullName,
  userEmail,
  userAvatarSrc,
  onUserMenuSignOut,
  onUserMenuChangePassword,
}: PortalPaceHeaderProps) {
  const isInRouterContext = useInRouterContext();
  const appSlug = appName?.toLowerCase();
  const appLogoWidePath = logoSrc ?? (appSlug != null ? `/logos/${appSlug}_logo_wide.svg` : null);
  const appLogoNarrowPath = logoSrc ?? (appSlug != null ? `/logos/${appSlug}_favicon.svg` : null);
  const logoClassName =
    'inline-grid h-9 w-auto rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1';
  const logoAriaLabel = appName != null ? `${appName} home` : 'Application home';
  const shouldRenderUserMenu =
    userFullName != null &&
    userEmail != null &&
    onUserMenuSignOut != null &&
    onUserMenuChangePassword != null;

  return (
    <header className="border-b border-main-300 bg-main-100" role="banner">
      <nav
        aria-label="Application header"
        className="mx-auto grid w-full max-w-(--app-width) grid-cols-[auto_auto_1fr_auto_auto] items-center gap-0 px-4 py-3"
      >
        <AppSwitcher
          currentAppName={appName}
          items={appSwitcherItems}
          className="hidden xs:grid xs:mr-3"
        />
        {isInRouterContext ? (
          <Link to={logoHref} className={logoClassName} aria-label={logoAriaLabel}>
            {appLogoWidePath != null || appLogoNarrowPath != null ? (
              <>
                {appLogoNarrowPath != null ? (
                  <img src={appLogoNarrowPath} alt={appName ?? 'Application logo'} className="h-9 w-9 md:hidden" />
                ) : null}
                {appLogoWidePath != null ? (
                  <img
                    src={appLogoWidePath}
                    alt={appName ?? 'Application logo'}
                    className="hidden h-9 w-auto md:inline-grid"
                  />
                ) : null}
              </>
            ) : (
              <span>Logo</span>
            )}
          </Link>
        ) : (
          <a href={logoHref} className={logoClassName} aria-label={logoAriaLabel}>
            {appLogoWidePath != null || appLogoNarrowPath != null ? (
              <>
                {appLogoNarrowPath != null ? (
                  <img src={appLogoNarrowPath} alt={appName ?? 'Application logo'} className="h-9 w-9 md:hidden" />
                ) : null}
                {appLogoWidePath != null ? (
                  <img
                    src={appLogoWidePath}
                    alt={appName ?? 'Application logo'}
                    className="hidden h-9 w-auto md:inline-grid"
                  />
                ) : null}
              </>
            ) : (
              <span>Logo</span>
            )}
          </a>
        )}
        <NavigationMenu items={navItems} className="ml-3 mr-3 lg:w-fit xl:w-72" />
        {showContextSelector ? (
          <ContextSelector
            showOrganisations={showOrganisations}
            showEvents={showEvents}
            className="justify-self-end mr-3 lg:w-fit xl:w-72"
          />
        ) : null}
        {shouldRenderUserMenu ? (
          <UserMenu
            fullName={userFullName}
            email={userEmail}
            avatarSrc={userAvatarSrc}
            onSignOut={onUserMenuSignOut}
            onChangePassword={onUserMenuChangePassword}
            className="justify-self-end mr-3 lg:w-fit xl:w-72"
          />
        ) : null}
      </nav>
    </header>
  );
}
