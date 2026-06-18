'use client';

/**
 * TopRightAvatar — small avatar pill in the top-right corner of every page
 * (mobile only; desktop uses the dashboard TopBar / public landing chrome).
 *
 * Phase 19 (2026-06-13). Tap to open a dropdown with:
 *   - Profile (link to /profile)
 *   - Sign out (POST to /api/auth/signout)
 *
 * Anonymous users see a "Sign in" pill instead of an avatar.
 *
 * Hides on the same routes as BottomNav (feed / auth / landing). The wrapper
 * decides role + initial; this client component handles the dropdown state.
 */

import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const HIDDEN_PREFIXES = [
  '/v/',
  '/browse/feed',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/',
];

// Community swipe feed: /c/<slug>/feed — also immersive, hide chrome.
const COMMUNITY_FEED_RE = /^\/c\/[^/]+\/feed(?:\/|$)/;

function isHidden(pathname: string): boolean {
  if (pathname === '/') return true;
  if (COMMUNITY_FEED_RE.test(pathname)) return true;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export type TopRightAvatarProps = {
  authed: boolean;
  /** First letter shown in the avatar circle (e.g. "P" for "Patrick"). */
  initial: string;
  /** Optional avatar image URL — preset path or Supabase Storage public URL. */
  avatarUrl?: string | null;
};

export function TopRightAvatar({ authed, initial, avatarUrl }: TopRightAvatarProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close menu on route change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (isHidden(pathname)) return null;

  if (!authed) {
    return (
      <div
        className="fixed top-3 right-3 z-30 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-full border-line border bg-bg px-4 font-medium text-ink2 text-xs backdrop-blur-md transition hover:border-line"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="fixed top-3 right-3 z-30 md:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-bg font-medium text-ink text-sm backdrop-blur-md transition active:scale-95"
      >
        {avatarUrl ? (
          // biome-ignore lint/a11y/useAltText: aria-label on the button covers it
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial.toUpperCase()
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border-line border bg-bg shadow-2xl shadow-black/40 backdrop-blur-md"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-ink2 text-sm transition hover:bg-surface/5"
          >
            <User size={16} aria-hidden="true" />
            Profile
          </Link>
          <form action="/api/auth/signout" method="post" className="border-line border-t">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-ink2 text-sm transition hover:bg-surface/5"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
