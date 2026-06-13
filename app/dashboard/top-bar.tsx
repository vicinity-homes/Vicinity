/**
 * TopBar — sticky header for dashboard routes.
 *
 * Visual style mirrors the demo: dark translucent background, agent name +
 * brokerage on the right, Sign out as a form POST (no client JS).
 *
 * Mobile nav is handled by the global BottomNav (app/_components/BottomNav),
 * which covers Home / Explore / Nearby / New / Community / Dashboard / Leads
 * / Profile. Sign out lives on the Profile page on mobile. So this header
 * only renders desktop-visible chrome (md+).
 */

type Props = {
  displayName: string;
  brokerage: string | null;
};

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/listings/new', label: 'New listing' },
  { href: '/dashboard/communities', label: 'Communities' },
  { href: '/dashboard/leads', label: 'Leads' },
];

export function TopBar({ displayName, brokerage }: Props) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{
        background: 'rgba(12, 12, 12, 0.72)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Dashboard">
          {NAV_ITEMS.map((it) => (
            <a
              key={it.href}
              href={it.href}
              className="hover:opacity-80"
              style={{ color: 'var(--muted)' }}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">{displayName}</div>
            {brokerage ? (
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {brokerage}
              </div>
            ) : null}
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm transition hover:opacity-80"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--muted)',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
