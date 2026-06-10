/**
 * Logo — global brand mark + wordmark, links to the landing page.
 *
 * One component used across dashboard, /browse, /v/[agent]/[listing], and
 * /a/[agentSlug] so the home redirect lives in exactly one place.
 *
 * Variants:
 *   - 'default'  — full mark + "Vicinity" wordmark (header bars).
 *   - 'overlay'  — compact, ink-tinted backdrop for use on top of dark video
 *                  feeds (e.g. /browse, /v/...). Lower visual weight.
 */

import Link from 'next/link';

type Props = {
  variant?: 'default' | 'overlay';
  className?: string;
};

export function Logo({ variant = 'default', className = '' }: Props) {
  if (variant === 'overlay') {
    return (
      <Link
        href="/"
        aria-label="Vicinity — back to home"
        className={`inline-flex items-center gap-2 rounded-full border border-cream/15 bg-ink/55 px-2.5 py-1.5 backdrop-blur-md transition-colors hover:border-gold/60 ${className}`}
        style={{ touchAction: 'manipulation' }}
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-md font-bold text-[12px]"
          style={{ background: 'var(--brand)', color: '#1a1300' }}
          aria-hidden="true"
        >
          V
        </span>
        <span className="font-serif font-semibold text-cream text-sm tracking-tight drop-shadow">
          Vicinity
        </span>
      </Link>
    );
  }
  return (
    <Link
      href="/"
      aria-label="Vicinity — back to home"
      className={`inline-flex items-center gap-2 transition-opacity hover:opacity-80 ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-md font-bold text-sm"
        style={{ background: 'var(--brand)', color: '#1a1300' }}
        aria-hidden="true"
      >
        V
      </span>
      <span className="font-semibold text-base tracking-tight">Vicinity</span>
    </Link>
  );
}
