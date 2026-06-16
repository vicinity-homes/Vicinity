/**
 * /c/[slug]/feed — buyer-facing community video swipe feed (Phase 27.7).
 *
 * Pure community-video feed: vertical swipe through every video that
 * belongs to this community (primary + extra memberships via the
 * community_video_membership view). No listing context, no agent CTA.
 * Save / Like target the community itself — the buyer is bookmarking
 * the neighborhood as a place to look for homes inside.
 *
 * `?start=<videoId>` — jump to a specific video (used when the buyer
 * taps a tile on `/c/[slug]`).
 */

import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CommunityVideoFeed, type CommunityFeedVideo } from './CommunityVideoFeed';

export const dynamic = 'force-dynamic';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
}

interface VideoRow {
  id: string;
  cf_video_id: string;
  title: string | null;
  category: string | null;
  created_at: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} · Vicinity`,
    description: 'Swipe through the neighborhood — schools, walks, food.',
  };
}

export default async function CommunityFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { slug } = await params;
  const { start } = await searchParams;
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: community } = (await (supabase as any)
    .from('communities')
    .select('id, name, slug, city, state')
    .eq('slug', slug)
    .maybeSingle()) as { data: CommunityRow | null };

  if (!community) notFound();

  // Membership view: primary community_id UNION extra links.
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
      .select('id, cf_video_id, title, category, created_at')
      .in('id', videoIds)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })) as { data: VideoRow[] | null };
    videos = rows ?? [];
  }

  const feedVideos: CommunityFeedVideo[] = videos.map((v) => ({
    id: v.id,
    cfVideoId: v.cf_video_id,
    title: v.title,
    category: v.category,
  }));

  // Resolve `start` (video id) → array index. Bad/missing falls to 0.
  let initialIndex = 0;
  if (start) {
    const idx = feedVideos.findIndex((v) => v.id === start);
    if (idx >= 0) initialIndex = idx;
  }

  return (
    <CommunityVideoFeed
      community={{
        id: community.id,
        name: community.name,
        slug: community.slug,
        city: community.city,
        state: community.state,
      }}
      videos={feedVideos}
      initialIndex={initialIndex}
    />
  );
}
