/**
 * WorkspaceSubNav — chips row that sits under the page heading on the agent's
 * three workspace surfaces (Listings / Communities / Leads).
 *
 * Phase 36.2 (2026-06-18). The bottom-nav "Workspace" tab lands on /dashboard
 * (listings view). Once an agent has listings, the onboarding empty-state CTA
 * cards no longer render, which leaves /dashboard/communities and
 * /dashboard/leads with no in-app mobile entry. Tianrou flagged the
 * communities case ("没办法 manage community 了"); leads is the same shape.
 *
 * One chips row, three pages, current page is gold-tinted and non-clickable.
 * Server-renderable — no client interactivity needed.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

type Section = 'listings' | 'communities' | 'leads';

const SECTIONS: { key: Section; label: string; href: string }[] = [
  { key: 'listings', label: 'Listings', href: '/dashboard' },
  { key: 'communities', label: 'Communities', href: '/dashboard/communities' },
  { key: 'leads', label: 'Leads', href: '/dashboard/leads' },
];

export function WorkspaceSubNav({ active, cta }: { active: Section; cta?: ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
      <nav aria-label="Workspace sections" className="flex gap-2 text-xs sm:text-sm">
        {SECTIONS.map((s) =>
          s.key === active ? (
            <span
              key={s.key}
              aria-current="page"
              className="rounded-full border border-line-strong bg-ink/10 px-3 py-1.5 font-medium text-ink"
            >
              {s.label}
            </span>
          ) : (
            <Link
              key={s.key}
              href={s.href}
              className="rounded-full border border-line px-3 py-1.5 text-ink2 transition hover:border-line-strong hover:text-ink"
            >
              {s.label}
            </Link>
          ),
        )}
      </nav>
      {cta ? <div className="shrink-0">{cta}</div> : null}
    </div>
  );
}
