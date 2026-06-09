/**
 * Feed composition (ARCHITECTURE.md §5).
 *
 * Pure function — Phase 3.8 will unit test this.
 *
 * Pattern (V1):
 *   - First two listing videos as "hook" (Vivian's sort_order).
 *   - Then 1:1 interleave (listing, community, listing, community, ...).
 *   - Whichever list runs out first, append the remainder of the other.
 *
 * Community video overlays per ARCH §5:
 *   SCHOOL       → name + grades · rating/10
 *   POI          → name + distance_text
 *   NEIGHBORHOOD → community.name + community.description
 */

import type { FeedCard } from '@/app/(public)/v/[agentSlug]/[listingSlug]/_components/types';

export type ComposeListingVideo = {
  id: string;
  cf_video_id: string;
  kind: string;
  title: string | null;
};

export type ComposeCommunityVideo = {
  id: string;
  cf_video_id: string;
  kind: string;
  title: string | null;
  school_id: string | null;
  poi_id: string | null;
};

export type ComposeSchool = {
  id: string;
  name: string;
  grades: string | null;
  rating: number | null;
};

export type ComposePoi = {
  id: string;
  name: string;
  poi_type: string;
  distance_text: string | null;
};

export type ComposeCommunity = {
  id: string;
  name: string;
  description: string | null;
};

export type ComposeInput = {
  listingVideos: ComposeListingVideo[];
  communityVideos: ComposeCommunityVideo[];
  schools: ComposeSchool[];
  pois: ComposePoi[];
  community: ComposeCommunity | null;
};

const HOOK_COUNT = 2;
const NEIGHBORHOOD_DESC_MAX = 80;

function listingCard(v: ComposeListingVideo): FeedCard {
  return {
    id: v.id,
    cfVideoId: v.cf_video_id,
    source: 'listing',
    kind: v.kind,
    title: v.title,
    overlay: null,
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function communityCard(
  v: ComposeCommunityVideo,
  schoolsById: Map<string, ComposeSchool>,
  poisById: Map<string, ComposePoi>,
  community: ComposeCommunity | null,
): FeedCard {
  const kind = v.kind.toUpperCase();
  let overlay: FeedCard['overlay'] = null;

  if (kind === 'SCHOOL' && v.school_id) {
    const s = schoolsById.get(v.school_id);
    if (s) {
      const grades = s.grades ? ` ${s.grades}` : '';
      overlay = {
        line1: `${s.name}${grades}`,
        line2: s.rating != null ? `${s.rating}/10` : undefined,
      };
    }
  } else if (kind === 'POI' && v.poi_id) {
    const p = poisById.get(v.poi_id);
    if (p) {
      overlay = {
        line1: p.name,
        line2: p.distance_text ?? undefined,
      };
    }
  } else if (kind === 'NEIGHBORHOOD' && community) {
    overlay = {
      line1: community.name,
      line2: community.description
        ? truncate(community.description, NEIGHBORHOOD_DESC_MAX)
        : undefined,
    };
  }

  return {
    id: v.id,
    cfVideoId: v.cf_video_id,
    source: 'community',
    kind: v.kind,
    title: v.title,
    overlay,
  };
}

export function composeFeed(input: ComposeInput): FeedCard[] {
  const { listingVideos, communityVideos, schools, pois, community } = input;
  const schoolsById = new Map(schools.map((s) => [s.id, s] as const));
  const poisById = new Map(pois.map((p) => [p.id, p] as const));

  const listings = listingVideos.map(listingCard);
  const communities = communityVideos.map((v) =>
    communityCard(v, schoolsById, poisById, community),
  );

  const out: FeedCard[] = [];

  // Hook: up to first HOOK_COUNT listing videos.
  const hook = listings.slice(0, HOOK_COUNT);
  out.push(...hook);

  // Interleave the rest.
  let li = HOOK_COUNT;
  let ci = 0;
  while (li < listings.length && ci < communities.length) {
    const l = listings[li];
    const c = communities[ci];
    if (l) out.push(l);
    if (c) out.push(c);
    li += 1;
    ci += 1;
  }

  // Append leftovers (whichever list still has items).
  for (; li < listings.length; li += 1) {
    const l = listings[li];
    if (l) out.push(l);
  }
  for (; ci < communities.length; ci += 1) {
    const c = communities[ci];
    if (c) out.push(c);
  }

  return out;
}
