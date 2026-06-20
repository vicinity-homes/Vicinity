'use client';

/**
 * DesktopSidebar — md+ left vertical rail.
 *
 * Phase 45 (2026-06-20). Replaces the prior horizontal <SiteHeader> with a
 * Xiaohongshu/Linear-shape vertical sidebar pinned to the left edge of the
 * viewport. Brand at the top, primary tabs as a vertical column, agent +
 * New as a dropdown trigger inserted between Community and Profile.
 *
 * Mobile (<md) hides itself — BottomNav handles primary nav there.
 *
 * Hides on the same routes as BottomNav (feed/auth/landing) via
 * isChromeHidden so root layout can mount it unconditionally.
 *
 * Width: 200px fixed. Layout uses md:pl-[200px] on TopBar + main content.
 */

import { Building2, ChevronDown, Plus, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/site/BrandMark';
import {
  getPrimaryTabs,
  isChromeHidden,
  isTabActive,
  type Tab,
  type ViewerRole,
} from './nav-config';

export type DesktopSidebarProps = {
  role: ViewerRole;
};

export function DesktopSidebar({ role }: DesktopSidebarProps) {
  const pathname = usePathname() ?? '/';
  if (isChromeHidden(pathname)) return null;

  const tabs = getPrimaryTabs(role);

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-50 hidden w-[200px] flex-col border-line border-r bg-bg md:flex"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="px-5 py-5">
        <BrandMark href={role === 'agent' ? '/dashboard' : '/'} />
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {tabs.map((tab) =>
          tab.fab ? (
            <NewDropdown key={tab.href} />
          ) : (
            <SidebarLink key={tab.href} tab={tab} active={isTabActive(pathname, tab)} />
          ),
        )}
      </nav>
    </aside>
  );
}

function SidebarLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? 'bg-surface/30 font-medium text-ink'
          : 'text-ink2 hover:bg-surface/20 hover:text-ink'
      }`}
    >
      <Icon size={18} aria-hidden="true" strokeWidth={active ? 1.75 : 1.5} />
      <span>{tab.label}</span>
    </Link>
  );
}

/**
 * NewDropdown — agent-only. Sidebar slot for the "+ New" tab. Click opens a
 * popover with Listing / Community options. Same affordance as the old
 * SiteHeader NewDropdown but rendered inline in the sidebar column instead of
 * a top-right pill.
 */
function NewDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          open
            ? 'bg-surface/30 font-medium text-ink'
            : 'text-ink2 hover:bg-surface/20 hover:text-ink'
        }`}
      >
        <Plus size={18} aria-hidden="true" strokeWidth={1.75} />
        <span>+ New</span>
        <ChevronDown size={14} aria-hidden="true" className="ml-auto" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-0 left-full z-50 ml-2 w-64 overflow-hidden rounded-xl border-line border bg-bg shadow-2xl shadow-black/40 backdrop-blur-md"
        >
          <Link
            href="/dashboard/listings/new"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/15 text-ink">
              <Building2 size={16} />
            </span>
            <span className="flex flex-col">
              <span className="font-medium text-ink text-sm">List a Property</span>
              <span className="text-ink2 text-xs">Add a home to your portfolio</span>
            </span>
          </Link>
          <Link
            href="/dashboard/communities"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-line border-t px-4 py-3 transition hover:bg-surface/5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/15 text-ink">
              <Video size={16} />
            </span>
            <span className="flex flex-col">
              <span className="font-medium text-ink text-sm">Add Community Video</span>
              <span className="text-ink2 text-xs">Show what a place feels like</span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
