import Link from 'next/link';

export interface SiteHeaderProps {
  /**
   * Whether the current viewer is an authenticated agent.
   * Server components should pass this after checking the Supabase session;
   * defaults to false (logged-out view).
   */
  loggedIn?: boolean;
  /**
   * When true, the header is absolutely positioned over the page (used on
   * full-bleed Landing hero). Default is sticky with a translucent background.
   */
  transparent?: boolean;
  /**
   * When true, draws a thin gold separator line under the header — used on
   * the public Listing route to bracket the feed.
   */
  showGoldLine?: boolean;
}

export function SiteHeader({
  loggedIn = false,
  transparent = false,
  showGoldLine = false,
}: SiteHeaderProps) {
  const positionClass = transparent
    ? 'absolute'
    : 'sticky bg-ink/80 backdrop-blur border-b border-white/5';

  return (
    <header className={`${positionClass} top-0 left-0 right-0 z-40`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl tracking-wide text-cream">
          Vicinity<span className="text-gold">.</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-7 text-sm text-cream/80">
          <Link href="/browse" className="hover:text-gold">
            Browse
          </Link>
          <Link href="/login" className="hover:text-gold">
            For agents
          </Link>
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="hover:text-gold">
                Dashboard
              </Link>
              <Link href="/auth/logout" className="hover:text-gold">
                Log out
              </Link>
            </>
          ) : (
            <Link href="/login" className="hover:text-gold">
              Log in
            </Link>
          )}
        </nav>
      </div>
      {showGoldLine && <div className="gold-line opacity-50" />}
    </header>
  );
}
