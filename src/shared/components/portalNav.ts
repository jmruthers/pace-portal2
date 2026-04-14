import type { NavigationItem } from '@solvera/pace-core/components';

/** Main authenticated shell navigation (PR01 non-payment surfaces). */
export const PORTAL_NAV_ITEMS: NavigationItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/' },
  { id: 'nav-member-profile', label: 'Member profile', href: '/member-profile' },
  { id: 'nav-medical-profile', label: 'Medical profile', href: '/medical-profile' },
  { id: 'nav-additional-contacts', label: 'Additional contacts', href: '/additional-contacts' },
];
