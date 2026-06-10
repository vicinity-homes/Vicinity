/**
 * Dashboard home — listings list (Phase 4.7).
 *
 * Replaces the Phase 1.5 placeholder empty state. Shows the agent's listings
 * with status badges and a "Show archived" toggle (URL searchParam
 * ?archived=1). Archived listings are hidden by default to keep the working
 * view uncluttered.
 *
 * RLS scopes the result to the calling agent's own listings.
 */

import { getRollupStats } from '@/lib/analytics/listing-stats';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type ListingRow = {
  id: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  price: number | null;
  updated_at: string;
};

interface PageProps {
  searchParams: Promise<{ archived?: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'published'
      ? 'bg-gold/15 text-gold border-gold/30'
      : status === 'archived'
        ? 'bg-cream/5 text-cream/50 border-cream/10'
        : 'bg-bronze/15 text-cream/80 border-bronze/30';
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  );
}

function RollupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-bronze/20 bg-ink p-3">
      <div className="text-[10px] uppercase tracking-wide text-cream/50">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

export default async function DashboardHomePage({ searchParams }: PageProps) {
  const { archived } = await searchParams;
  const showArchived = archived === '1';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: agentRow } = (await (supabase as any)
    .from('agents')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: { slug: string } | null };
  const agentSlug = agentRow?.slug ?? null;

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  let query = (supabase as any)
    .from('listings')
    .select('id, slug, address, city, state, status, price, updated_at')
    .order('updated_at', { ascending: false });

  if (!showArchived) {
    query = query.neq('status', 'archived');
  }

  const { data: listings } = (await query) as { data: ListingRow[] | null };
  const rows = listings ?? [];

  // Phase 6.5 — rollup stats across the *published* subset only. Drafts and
  // archived listings have no traffic by definition (no public URL), so
  // mixing them in just dilutes the headline numbers.
  const publishedIds = rows.filter((l) => l.status === 'published').map((l) => l.id);
  const rollup = await getRollupStats(supabase, publishedIds);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <div className="flex items-center gap-2">
          {agentSlug && (
            <Link
              href={`/a/${agentSlug}`}
              target="_blank"
              rel="noopener"
              className="rounded border border-bronze/40 px-3 py-2 text-cream/80 text-xs hover:bg-bronze/20"
              title="Public profile — share one URL with all your listings"
            >
              View public profile ↗
            </Link>
          )}
          <Link
            href="/dashboard/listings/new"
            className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold/90"
          >
            + New listing
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs">
        <Link
          href="/dashboard"
          className={`rounded px-3 py-1 ${
            !showArchived ? 'bg-bronze/30 text-cream' : 'text-cream/60 hover:text-cream'
          }`}
        >
          Active
        </Link>
        <Link
          href="/dashboard?archived=1"
          className={`rounded px-3 py-1 ${
            showArchived ? 'bg-bronze/30 text-cream' : 'text-cream/60 hover:text-cream'
          }`}
        >
          Show archived
        </Link>
      </div>

      {publishedIds.length > 0 && (
        <section className="mb-6 rounded border border-bronze/30 bg-ink2 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-cream/60">
              Across {publishedIds.length} published{' '}
              {publishedIds.length === 1 ? 'listing' : 'listings'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <RollupStat label="Page views" value={rollup.pageViews} />
            <RollupStat label="Unique sessions" value={rollup.uniqueSessions} />
            <RollupStat label="Video completes" value={rollup.videoCompletes} />
            <RollupStat label="Leads" value={rollup.leads} />
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bronze/40 bg-ink2 px-8 py-16 text-center">
          <p className="text-sm text-cream/70">
            {showArchived ? 'No archived listings.' : 'No listings yet — create your first one.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-bronze/20 rounded border border-bronze/30 bg-ink2">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-cream">
                    {l.address ?? '(no address)'}
                  </p>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-cream/50">
                  {l.city && l.state ? `${l.city}, ${l.state}` : '—'}
                  {l.price != null && ` · $${l.price.toLocaleString()}`}
                </p>
              </div>
              <Link
                href={`/dashboard/listings/${l.id}/edit`}
                className="rounded border border-bronze/50 px-3 py-1 text-xs text-cream hover:bg-bronze/20"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
