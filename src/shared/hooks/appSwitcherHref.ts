/**
 * Builds navigation targets for suite apps (AppSwitcher). Override with `VITE_SUITE_APP_ORIGIN`.
 */
export function buildAppSwitcherHref(appSlug: string): string {
  const origin = import.meta.env.VITE_SUITE_APP_ORIGIN;
  const slug = appSlug.toLowerCase();
  if (typeof origin === 'string' && origin.length > 0) {
    return `${origin.replace(/\/$/, '')}/${slug}`;
  }
  return `/${slug}`;
}
