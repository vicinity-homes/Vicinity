/**
 * /communities — buyer-facing community grid (Phase 27).
 *
 * Public-readable: anyone (anon, buyer, agent) can browse the list of
 * communities. Each card links to /c/[slug] (the community swipe feed).
 *
 * This is the buyer-side counterpart to /dashboard/communities (the agent
 * management view). They share the underlying communities table but render
 * differently: agents see Edit/Upload affordances, buyers see a content-
 * forward grid.
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
  description: string | null;
}

interface VideoCountRow {
  community_id: string;
  count: number;
}

export default async function CommunitiesGridPage() {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rows } = (await (supabase as any)
    .from('communities')
    .select('id, name, slug, city, state, description')
    .order('name', { ascending: true })) as { data: CommunityRow[] | null };

  const communities = rows ?? [];

  // Pull video counts per community via the membership view (UNION of
  // primary community_id + extra links). One query, group client-side —
  // V1 community count is small enough this is fine.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: memberships } = (await (supabase as any)
    .from('community_video_membership')
    .select('community_id, video_id')) as {
    data: Array<{ community_id: string; video_id: string }> | null;
  };

  const countByCommunity = new Map<string, number>();
  for (const m of memberships ?? []) {
    countByCommunity.set(m.community_id, (countByCommunity.get(m.community_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="font-semibold text-2xl text-cream tracking-tight">Communities</h1>
        <p className="mt-1 text-cream/60 text-sm">
          Walk the block, hear the morning rush, see what after-dark really looks like — twelve
          neighborhood stories per community.
        </p>
      </header>

      {communities.length === 0 ? (
        <div className="rounded border border-bronze/30 border-dashed bg-ink2 px-6 py-12 text-center">
          <p className="text-cream/60 text-sm">No communities yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => {
            const videoCount = countByCommunity.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  prefetch={false}
                  className="block rounded-xl border border-bronze/30 bg-ink2 p-4 transition hover:border-gold/60"
                >
                  <div className="font-medium text-cream">{c.name}</div>
                  <div className="mt-0.5 text-cream/50 text-xs">
                    {c.city ? `${c.city}, ${c.state}` : c.state}
                  </div>
                  {c.description ? (
                    <p className="mt-2 line-clamp-2 text-cream/70 text-xs">{c.description}</p>
                  ) : null}
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                    {videoCount} {videoCount === 1 ? 'video' : 'videos'}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
