/**
 * nav-config — SSOT for primary navigation + sub-tabs.
 *
 * Both <BottomNav> (mobile bottom bar) and <DesktopSidebar> (md+ left rail) +
 * <TopBar> (mobile + desktop top bar with sub-tabs) consume the same tab
 * definitions so chrome can't drift across breakpoints. Add or rename a tab
 * once here; every surface picks it up.
 *
 * Phase 26 (2026-06-14): introduced when porting mobile-only chrome to desktop.
 * Phase 27 (2026-06-16): drop "Home" tab, promote "Community" to leftmost slot.
 * Phase 36 (2026-06-18): unified IA. One nav for all roles — agents and buyers
 *   share the same 5-slot bar with Explore as the center FAB.
 * Phase 37 (2026-06-18): collapse "Nearby" tab into Explore as a sub-tab,
 *   drop the center FAB. Bottom nav is now a flat 4-icon bar.
 * Phase 43.7 (2026-06-20): drop the Recommended/Nearby split inside /browse.
 * Phase 45 (2026-06-20): ground-up nav redesign — left vertical sidebar on
 *   desktop, top bar with [search · sub-tabs · avatar] on every breakpoint.
 *   `getSubTabs(pathname, role)` is the SSOT for the contextual second-level nav.
 * Phase 45.9 (2026-06-20): owner round 1 — Favorites dropped, anon Me ->
 *   /login direct. Phase 45.10 (2026-06-20): owner round 2 — Favorites
 *   restored; anon Me now points at /profile (which renders the Log in /
 *   Sign up CTA + NearbyRadiusPref) instead of /login directly.
 */
import {
  Bookmark,
  Briefcase,
  Building2,
  Compass,
  type LucideIcon,
  Plus,
  User,
} from 'lucide-react';

export type ViewerRole = 'anon' | 'buyer' | 'agent';

export type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pathname is "active" if it equals href OR starts with `${href}/`. */
  matchPrefix?: boolean;
  /** When true, this slot renders as a center FAB in BottomNav and as a
   *  dropdown trigger in DesktopSidebar (not a normal Link). */
  fab?: boolean;
};

/**
 * Build the role's primary tabs.
 *
 * - anon:  For You · Community · Favorites · Me  (Me -> /profile, which
 *          itself renders Log in / Sign up + NearbyRadiusPref for anon)
 * - buyer: For You · Community · Favorites · Me
 * - agent: Agent Hub · For You · Community · + New · Favorites · Me
 *
 * Phase 45.10: Favorites restored to primary tabs across all roles.
 */
export function getPrimaryTabs(role: ViewerRole): Tab[] {
  if (role === 'agent') {
    return [
      { href: '/dashboard', label: 'Agent Hub', icon: Briefcase, matchPrefix: true },
      { href: '/browse', label: 'For You', icon: Compass, matchPrefix: true },
      { href: '/communities', label: 'Community', icon: Building2, matchPrefix: true },
      { href: '/upload', label: '+ New', icon: Plus, fab: true },
      { href: '/saved', label: 'Favorites', icon: Bookmark },
      { href: '/profile', label: 'Me', icon: User },
    ];
  }

  return [
    { href: '/browse', label: 'For You', icon: Compass, matchPrefix: true },
    { href: '/communities', label: 'Community', icon: Building2, matchPrefix: true },
    { href: '/saved', label: 'Favorites', icon: Bookmark },
    { href: '/profile', label: 'Me', icon: User },
  ];
}

/**
 * Sub-tab — second-level horizontal nav rendered in the TopBar middle slot.
 */
export type SubTab = {
  href: string;
  label: string;
};

/**
 * Resolve sub-tabs for the current pathname.
 */
export function getSubTabs(pathname: string, role: ViewerRole): SubTab[] | null {
  if (pathname === '/browse' || pathname.startsWith('/browse/')) {
    return [
      { href: '/browse', label: 'Explore' },
      { href: '/browse/nearby', label: 'Nearby' },
    ];
  }
  if (pathname === '/communities' || pathname.startsWith('/communities/')) {
    return [
      { href: '/communities', label: 'Explore' },
      { href: '/communities/nearby', label: 'Nearby' },
    ];
  }
  if (pathname === '/saved' || pathname.startsWith('/saved/')) {
    return null; // SavedClient owns its own Listings/Communities pill row.
  }
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    return null;
  }
  if (role === 'agent' && (pathname === '/dashboard' || pathname.startsWith('/dashboard'))) {
    return [
      { href: '/dashboard', label: 'Listings' },
      { href: '/dashboard/communities', label: 'Communities' },
      { href: '/dashboard/leads', label: 'Leads' },
      { href: '/dashboard/analytics', label: 'Analytics' },
    ];
  }
  return null;
}

/**
 * Active rule for sub-tabs — longest-prefix-wins so /dashboard doesn't
 * swallow /dashboard/communities, /dashboard/leads, /dashboard/analytics.
 */
export function isSubTabActive(pathname: string, sub: SubTab, all: SubTab[]): boolean {
  const matches = all.filter(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );
  if (matches.length === 0) {
    return sub.href === all[0]?.href;
  }
  const best = matches.reduce((a, b) => (a.href.length >= b.href.length ? a : b));
  return sub.href === best.href;
}

/**
 * Routes where chrome (BottomNav + DesktopSidebar + TopBar) hides itself
 * entirely: the swipe feed, auth screens, and the landing hero.
 */
export const CHROME_HIDDEN_PREFIXES = [
  '/v/',
  '/browse/feed',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
];

const COMMUNITY_FEED_RE = /^\/c\/[^/]+\/feed(?:\/|$)/;

export function isChromeHidden(pathname: string): boolean {
  if (pathname === '/') return true;
  if (COMMUNITY_FEED_RE.test(pathname)) return true;
  return CHROME_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function isTabActive(pathname: string, tab: Tab): boolean {
  if (tab.matchPrefix === true) {
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }
  return pathname === tab.href;
}
