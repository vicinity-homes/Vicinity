/**
 * Public browse page — `/browse`.
 *
 * Hotfix 2026-06-10: Landing CTA + SiteHeader nav both link to `/browse`
 * (introduced in phase8.2.B Landing rewrite) but the route was never built.
 * Result: live 404 from the homepage hero. Surgical fix — ship a real
 * discover-all-listings page, mirroring the agent-profile listings grid.
 *
 * Lists every `status='published'` listing across all agents, newest first.
 * Server Component, ISR (revalidate=300). RLS already allows public SELECT
 * on published listings.
 */

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 300;

type Row = {
  id: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  cover_url: string | null;
  created_at: string;
  agent_id: string;
  hero_video_id: string | null;
};

type AgentLite = { id: string; slug: string; name: string };

export const metadata: Metadata = {
  title: 'Browse listings | Vicinity',
  description: 'Discover homes for sale on Vicinity — short videos, real agents, no spam.',
};

async function fetchData(): Promise<{ rows: Row[]; agentsById: Map<string, AgentLite> }> {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rawListings } = (await (supabase as any)
    .from('listings')
    .select(
      'id, slug, address, city, state, price, beds, baths, sqft, cover_url, created_at, agent_id',
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60)) as { data: Omit<Row, 'hero_video_id'>[] | null };

  const listings = rawListings ?? [];
  if (listings.length === 0) {
    return { rows: [], agentsById: new Map() };
  }

  const listingIds = listings.map((l) => l.id);
  const agentIds = Array.from(new Set(listings.map((l) => l.agent_id)));

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rawVideos } = (await (supabase as any)
    .from('listing_videos')
    .select('listing_id, cf_video_id, sort_order')
    .in('listing_id', listingIds)
    .eq('status', 'ready')
    .order('sort_order', { ascending: true })) as {
    data: { listing_id: string; cf_video_id: string }[] | null;
  };
  const firstVideoByListing = new Map<string, string>();
  for (const v of rawVideos ?? []) {
    if (!firstVideoByListing.has(v.listing_id)) {
      firstVideoByListing.set(v.listing_id, v.cf_video_id);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rawAgents } = (await (supabase as any)
    .from('agents')
    .select('id, slug, name')
    .in('id', agentIds)) as { data: AgentLite[] | null };
  const agentsById = new Map<string, AgentLite>();
  for (const a of rawAgents ?? []) agentsById.set(a.id, a);

  const rows: Row[] = listings.map((l) => ({
    ...l,
    hero_video_id: firstVideoByListing.get(l.id) ?? null,
  }));
  return { rows, agentsById };
}

export default async function BrowsePage() {
  const { rows, agentsById } = await fetchData();

  return (
    <div className="min-h-screen bg-ink text-cream">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl">Browse listings</h1>
          <p className="mt-2 text-cream/60 text-sm">
            {rows.length === 0
              ? 'No listings live yet — check back soon.'
              : `${rows.length} ${rows.length === 1 ? 'home' : 'homes'} on Vicinity right now.`}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-bronze/30 bg-ink2/60 p-8 text-center">
            <p className="text-cream/70">Vicinity is just getting started.</p>
            <p className="mt-1 text-cream/40 text-sm">
              <Link href="/" className="underline hover:text-gold">
                Back home
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => {
              const agent = agentsById.get(l.agent_id);
              if (!agent) return null;
              const cover = l.cover_url ?? (l.hero_video_id ? thumbnailUrl(l.hero_video_id) : null);
              return (
                <Link
                  key={l.id}
                  href={`/v/${agent.slug}/${l.slug}`}
                  className="group overflow-hidden rounded-xl border border-bronze/30 bg-ink2/60 transition hover:border-gold/50"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-ink">
                    {cover ? (
                      <img
                        src={cover}
                        alt={l.address}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-cream/30 text-xs">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-serif text-cream text-lg leading-tight">
                      {l.price != null ? `$${formatPrice(l.price)}` : 'Price upon request'}
                    </div>
                    <div className="mt-0.5 truncate text-cream/80 text-sm">{l.address}</div>
                    <div className="text-cream/50 text-xs">
                      {l.city}, {l.state}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-cream/60 text-xs">
                      {l.beds != null && <span>{l.beds} bd</span>}
                      {l.baths != null && <span>· {l.baths} ba</span>}
                      {l.sqft != null && <span>· {l.sqft.toLocaleString()} sqft</span>}
                    </div>
                    <div className="mt-2 text-cream/40 text-[11px]">Listed by {agent.name}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(2).replace(/\.0+$/, '')}M`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
  return price.toLocaleString();
}
