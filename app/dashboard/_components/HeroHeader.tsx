/**
 * HeroHeader — 2-section hero for the agent listing detail page.
 *
 * Phase 47.11: stats removed from hero per agent feedback ("hero pic should
 * be hero pic"). The grid is now `auto 1fr` — controls on top, home info
 * vertically centered. Stats live inline at the top of the Analytics tab.
 *
 * No `position: absolute`. Physical separation, zero overlap risk regardless
 * of address length.
 *
 * Server-renderable; interactive children (StatusPill, delete button) are
 * passed in as `controls`.
 */
import type { ReactNode } from 'react';

type Props = {
  coverUrl: string | null;
  title: string;
  subtitle?: string;
  /** Right-aligned control row (Preview button, status toggle, delete). */
  controls?: ReactNode;
};

export function HeroHeader({ coverUrl, title, subtitle, controls }: Props) {
  return (
    <header className="mx-auto max-w-6xl">
      <div
        className="relative grid w-full overflow-hidden bg-surface sm:rounded-b-xl"
        style={{
          aspectRatio: '5 / 2',
          gridTemplateRows: 'auto 1fr',
          padding: '12px 18px',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted text-xs">
            No cover image yet
          </div>
        )}
        {/* Scrim — keeps chromeless white text legible on bright covers. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 30%, transparent 55%, rgba(0,0,0,0.55))',
          }}
        />

        {/* §1 — controls (top, right) */}
        <div className="relative z-10 flex items-center justify-end gap-1">
          {controls}
        </div>

        {/* §2 — home info (bottom, left, vertically centered in remaining space) */}
        <div className="relative z-10 flex flex-col justify-end pb-2 text-surface">
          <h1
            className="font-serif font-semibold text-2xl leading-tight drop-shadow sm:text-3xl"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-surface/90 drop-shadow">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
