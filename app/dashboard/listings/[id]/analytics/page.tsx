/**
 * /dashboard/listings/[id]/analytics — per-listing analytics. Phase 6.4b.
 *
 * Pure SSR. RLS gates the events/leads queries to the agent's owned
 * listings, so an unowned id will land in the not-found path naturally.
 *
 * Numbers shown: page views, unique sessions, video completes, leads,
 * lead conversion %. That's the V1 vocabulary Vivian asked for; we
 * intentionally don't render time-series charts yet — there's not enough
 * data to make them meaningful and Phase 7 internal beta will surface
 * which dimensions actually matter.
 */

import { getListingStats } from '@/lib/analytics/listing-stats';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface ListingRow {
  id: string;
  address: string;
  city: string;
  state: string;
  status: string;
}

export default async function ListingAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rawListing } = await supabase
    .from('listings')
    .select('id, address, city, state, status')
    .eq('id', id)
    .maybeSingle();
  const listing = rawListing as ListingRow | null;
  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-cream">
        <p className="text-sm text-cream/60">Listing not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const stats = await getListingStats(supabase, listing.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 text-cream">
      <div className="mb-2 flex items-center gap-3 text-xs text-cream/50">
        <Link href={`/dashboard/listings/${listing.id}/edit`} className="hover:underline">
          ← Back to listing
        </Link>
        <span>·</span>
        <span className="uppercase tracking-wide">{listing.status}</span>
      </div>
      <h1 className="text-2xl font-semibold">{listing.address}</h1>
      <p className="mt-1 text-sm text-cream/60">
        {listing.city}, {listing.state}
      </p>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Page views" value={stats.pageViews} />
        <Stat label="Unique sessions" value={stats.uniqueSessions} />
        <Stat label="Video completes" value={stats.videoCompletes} />
        <Stat label="Leads" value={stats.leads} />
      </section>

      <section className="mt-6 rounded border border-bronze/30 bg-ink2 p-6">
        <div className="text-xs uppercase tracking-wide text-cream/50">Lead conversion</div>
        <div className="mt-1 text-2xl font-semibold">{stats.leadConversionPct}%</div>
        <p className="mt-1 text-xs text-cream/50">
          {stats.leads} leads ÷ {stats.uniqueSessions} unique sessions.
          {stats.uniqueSessions === 0 && ' No sessions yet — share the listing to see numbers.'}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-bronze/30 bg-ink2 p-4">
      <div className="text-xs uppercase tracking-wide text-cream/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
