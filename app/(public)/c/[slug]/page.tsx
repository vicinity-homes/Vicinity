/**
 * /c/[slug] — buyer-facing community page.
 *
 * Phase 27: shipped IA + thumbnail grid + active-listings count.
 * Phase 45.10 (2026-06-20, owner round 2): hero cover height reduced
 * (21:9 → 16:7 → effectively half on mobile), and the page now hosts a
 * sub-tab toggle for [Community Videos | Active Listings] so the listings
 * inside this community are reachable without a round-trip to /browse.
 *
 * Both grids share the unified /browse card style (3:4 frame, caption
 * below image) — see <CommunityTabs>.
 */

import { resolveCommunityCoverWithCfIds } from '@/lib/community/cover';
import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { demoCoverFor } from '@/lib/demo-media';
import { fetchBrowseCardsByCommunitySlug } from '@/lib/feed/browse-cards';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CommunityTabs } from './_components/CommunityTabs';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
  description: string | null;
  created_by: string | null;
  cover_video_id: string | null;
  cover_storage_path: string | null;
}

interface VideoRow {
  id: string;
  cf_video_id: string;
  title: string | null;
  category: string | null;
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: community } = (await (supabase as any)
    .from('communities')
    .select('id, name, slug, city, state, description, created_by, cover_video_id, cover_storage_path')
    .eq('slug', slug)
    .maybeSingle()) as { data: CommunityRow | null };

  if (!community) notFound();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: memberships } = (await (supabase as any)
    .from('community_video_membership')
    .select('video_id')
    .eq('community_id', community.id)) as { data: Array<{ video_id: string }> | null };

  const videoIds = (memberships ?? []).map((m) => m.video_id);

  let videos: VideoRow[] = [];
  if (videoIds.length > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: stub generated types
    const { data: rows } = (await (supabase as any)
      .from('community_videos')
      .select('id, cf_video_id, title, category')
      .in('id', videoIds)
      .eq('status', 'ready')
      .eq('visibility', 'public')) as { data: VideoRow[] | null };
    videos = rows ?? [];
  }

  // Active listings inside this community — reuse the browse-card builder
  // so cards match the global feed shape exactly (BrowseCard type).
  const listings = await fetchBrowseCardsByCommunitySlug(community.slug);

  // Hero cover.
  const firstReadyVideo = videos[0] ?? null;
  const coverVideoCfId = community.cover_video_id
    ? videos.find((v) => v.id === community.cover_video_id)?.cf_video_id ?? null
    : null;
  const heroCover = resolveCommunityCoverWithCfIds({
    cover_video_id: community.cover_video_id,
    cover_video_cf_id: coverVideoCfId,
    cover_storage_path: community.cover_storage_path,
    fallback_video_cf_id: firstReadyVideo?.cf_video_id ?? null,
  });
  void thumbnailUrl; // imported for transitive demoCoverFor needs in CommunityTabs
  void demoCoverFor;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero — phase 45.10 reduced from 21:9 to 16:7 (mobile) / 21:7 (md+).
        * Owner: \"reduce the height of the community pic\". */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-surface md:aspect-[21/7] sm:rounded-b-xl">
        {heroCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={demoCoverFor(community.slug, heroCover.url) ?? heroCover.url}
            alt={community.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bronze/30 to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 px-4 py-3 sm:px-6 sm:py-4">
          <h1 className="font-semibold text-2xl text-cream tracking-tight sm:text-3xl">
            {community.name}
          </h1>
          <div className="mt-0.5 text-cream/75 text-sm">
            {community.city ? `${community.city}, ${community.state}` : community.state}
          </div>
          {community.description ? (
            <p className="mt-1 max-w-2xl text-cream/80 text-xs sm:text-sm">
              {community.description}
            </p>
          ) : null}
        </div>
      </div>

      <CommunityTabs
        communitySlug={community.slug}
        videos={videos}
        listings={listings}
      />
    </div>
  );
}
