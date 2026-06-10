/**
 * /browse — discovery feed across all agents (TikTok mode, demo-parity).
 *
 * Hotfix v3 2026-06-10: per-listing source switching. Each card now carries
 * its hero listing video plus community-side b-roll (schools / POIs / the
 * neighborhood video). Right rail buttons swap the *active* card's playing
 * video to the matching source — same pattern as the demo's Listing.jsx.
 *
 * Server fetches up to 30 published listings, batches per-community-bound
 * data (community_videos + schools + pois) by community_id, then assembles
 * a `BrowseCard` per listing with all four sources resolved.
 */

import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { type BrowseCard, BrowseFeed } from './_components/BrowseFeed';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse listings | Vicinity',
  description: 'Discover homes for sale on Vicinity — short videos, real agents, no spam.',
};

const FEED_LIMIT = 30;

type ListingRow = {
  id: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  community_id: string | null;
  agent_id: string;
};

type AgentRow = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ListingVideoRow = {
  listing_id: string;
  cf_video_id: string;
  title: string | null;
  kind: string;
  sort_order: number;
};

type CommunityVideoRow = {
  community_id: string;
  cf_video_id: string;
  title: string | null;
  kind: string; // SCHOOL | POI | NEIGHBORHOOD
  school_id: string | null;
  poi_id: string | null;
};

type SchoolRow = {
  community_id: string;
  id: string;
  name: string;
  grades: string | null;
  rating: number | null;
};

type PoiRow = {
  community_id: string;
  id: string;
  name: string;
  distance_text: string | null;
};

type CommunityRow = { id: string; name: string; description: string | null };

async function fetchCards(): Promise<BrowseCard[]> {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rawListings } = (await (supabase as any)
    .from('listings')
    .select('id, slug, address, city, state, price, beds, baths, sqft, community_id, agent_id')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT)) as { data: ListingRow[] | null };

  const listings = rawListings ?? [];
  if (listings.length === 0) return [];

  const listingIds = listings.map((l) => l.id);
  const agentIds = Array.from(new Set(listings.map((l) => l.agent_id)));
  const communityIds = Array.from(
    new Set(listings.map((l) => l.community_id).filter((x): x is string => !!x)),
  );

  const [listingVidsResp, agentsResp, commVidsResp, schoolsResp, poisResp, communitiesResp] =
    await Promise.all([
      // biome-ignore lint/suspicious/noExplicitAny: stub generated types
      (supabase as any)
        .from('listing_videos')
        .select('listing_id, cf_video_id, title, kind, sort_order')
        .in('listing_id', listingIds)
        .eq('status', 'ready')
        .order('sort_order', { ascending: true }),
      // biome-ignore lint/suspicious/noExplicitAny: stub generated types
      (supabase as any)
        .from('agents')
        .select('id, slug, name, email, phone')
        .in('id', agentIds),
      communityIds.length > 0
        ? // biome-ignore lint/suspicious/noExplicitAny: stub generated types
          (supabase as any)
            .from('community_videos')
            .select('community_id, cf_video_id, title, kind, school_id, poi_id')
            .in('community_id', communityIds)
            .eq('status', 'ready')
        : Promise.resolve({ data: [] }),
      communityIds.length > 0
        ? // biome-ignore lint/suspicious/noExplicitAny: stub generated types
          (supabase as any)
            .from('schools')
            .select('community_id, id, name, grades, rating')
            .in('community_id', communityIds)
        : Promise.resolve({ data: [] }),
      communityIds.length > 0
        ? // biome-ignore lint/suspicious/noExplicitAny: stub generated types
          (supabase as any)
            .from('pois')
            .select('community_id, id, name, distance_text')
            .in('community_id', communityIds)
        : Promise.resolve({ data: [] }),
      communityIds.length > 0
        ? // biome-ignore lint/suspicious/noExplicitAny: stub generated types
          (supabase as any)
            .from('communities')
            .select('id, name, description')
            .in('id', communityIds)
        : Promise.resolve({ data: [] }),
    ]);

  const listingVideos = (listingVidsResp.data ?? []) as ListingVideoRow[];
  const agents = (agentsResp.data ?? []) as AgentRow[];
  const commVideos = (commVidsResp.data ?? []) as CommunityVideoRow[];
  const schools = (schoolsResp.data ?? []) as SchoolRow[];
  const pois = (poisResp.data ?? []) as PoiRow[];
  const communities = (communitiesResp.data ?? []) as CommunityRow[];

  const heroByListing = new Map<string, ListingVideoRow>();
  for (const v of listingVideos) {
    if (!heroByListing.has(v.listing_id)) heroByListing.set(v.listing_id, v);
  }
  const agentsById = new Map(agents.map((a) => [a.id, a] as const));
  const communitiesById = new Map(communities.map((c) => [c.id, c] as const));
  const schoolsById = new Map(schools.map((s) => [s.id, s] as const));
  const poisById = new Map(pois.map((p) => [p.id, p] as const));

  const commVidsByCommunity = new Map<string, CommunityVideoRow[]>();
  for (const v of commVideos) {
    const arr = commVidsByCommunity.get(v.community_id) ?? [];
    arr.push(v);
    commVidsByCommunity.set(v.community_id, arr);
  }

  const cards: BrowseCard[] = [];
  for (const l of listings) {
    const hero = heroByListing.get(l.id);
    const agent = agentsById.get(l.agent_id);
    if (!hero || !agent) continue;

    const community = l.community_id ? (communitiesById.get(l.community_id) ?? null) : null;
    const cVids = l.community_id ? (commVidsByCommunity.get(l.community_id) ?? []) : [];

    const schoolVideos = cVids
      .filter((v) => v.kind.toUpperCase() === 'SCHOOL')
      .map((v) => {
        const s = v.school_id ? schoolsById.get(v.school_id) : undefined;
        return {
          cfVideoId: v.cf_video_id,
          line1: s ? `${s.name}${s.grades ? ` ${s.grades}` : ''}` : (v.title ?? 'School'),
          line2: s?.rating != null ? `${s.rating}/10` : undefined,
        };
      });

    const nearbyVideos = cVids
      .filter((v) => v.kind.toUpperCase() === 'POI')
      .map((v) => {
        const p = v.poi_id ? poisById.get(v.poi_id) : undefined;
        return {
          cfVideoId: v.cf_video_id,
          line1: p?.name ?? v.title ?? 'Nearby',
          line2: p?.distance_text ?? undefined,
        };
      });

    const communityVideos = cVids
      .filter((v) => v.kind.toUpperCase() === 'NEIGHBORHOOD')
      .map((v) => ({
        cfVideoId: v.cf_video_id,
        line1: community?.name ?? v.title ?? 'Neighborhood',
        line2: community?.description
          ? community.description.length > 80
            ? `${community.description.slice(0, 79)}…`
            : community.description
          : undefined,
      }));

    cards.push({
      id: hero.cf_video_id,
      hero: { cfVideoId: hero.cf_video_id },
      schoolVideos,
      nearbyVideos,
      communityVideos,
      listing: {
        id: l.id,
        slug: l.slug,
        address: l.address,
        city: l.city,
        state: l.state,
        price: l.price,
        beds: l.beds,
        baths: l.baths,
        sqft: l.sqft,
      },
      agent: {
        slug: agent.slug,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
      },
    });
  }
  return cards;
}

export default async function BrowsePage() {
  const cards = await fetchCards();

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-cream">
        <div className="text-center">
          <h1 className="font-serif text-2xl">No listings live yet</h1>
          <p className="mt-2 text-cream/60 text-sm">
            Check back soon — Vicinity is just getting started.
          </p>
        </div>
      </div>
    );
  }

  return <BrowseFeed cards={cards} />;
}
