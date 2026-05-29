/**
 * Canonical PACE `rbac_app_pages.page_name` slugs for pace-portal (Standard 03 — Page key naming).
 * Must match catalogue rows for `APP_NAME` (`PACE`) and permission strings `read:page.{slug}`.
 * {@link PagePermissionGuard} `pageName` must use the string literal values below (audit regex).
 */
export const RBAC_PAGE_DASHBOARD = 'dashboard';
export const RBAC_PAGE_PROFILE_COMPLETE = 'profile-complete';
export const RBAC_PAGE_MEMBER_PROFILE = 'member-profile';
export const RBAC_PAGE_MEDICAL_PROFILE = 'medical-profile';
export const RBAC_PAGE_ADDITIONAL_CONTACTS = 'additional-contacts';
export const RBAC_PAGE_MY_MEMBERSHIPS = 'my-memberships';

/** Portal catalogue pages guarded by {@link PagePermissionGuard} (excludes interim-only aliases). */
export const PORTAL_RBAC_PAGE_NAMES = [
  RBAC_PAGE_DASHBOARD,
  RBAC_PAGE_PROFILE_COMPLETE,
  RBAC_PAGE_MEMBER_PROFILE,
  RBAC_PAGE_MEDICAL_PROFILE,
  RBAC_PAGE_ADDITIONAL_CONTACTS,
  RBAC_PAGE_MY_MEMBERSHIPS,
] as const;

export type PortalRbacPageName = (typeof PORTAL_RBAC_PAGE_NAMES)[number];
