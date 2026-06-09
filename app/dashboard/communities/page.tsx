/**
 * /dashboard/communities — list page (Phase 4.4).
 *
 * V1 design choice: communities are shared (any authenticated agent can
 * create/edit per the `agents manage communities` RLS policy). So this list
 * is unscoped — every agent sees the same global set. We're betting the
 * agent count stays small enough in V1 that this is fine; if it gets messy
 * later we can scope by `created_by` (column doesn't exist yet).
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
}

export default async function CommunitiesListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fdashboard%2Fcommunities');

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: rows } = (await (supabase as any)
    .from('communities')
    .select('id, name, slug, city, state')
    .order('name', { ascending: true })) as { data: CommunityRow[] | null };

  const communities = rows ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
          <p className="mt-1 text-sm text-cream/60">
            Shared across all agents. Add schools and POIs once; every listing in this community can
            reference them.
          </p>
        </div>
        <Link
          href="/dashboard/communities/new"
          className="rounded bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90"
        >
          + New community
        </Link>
      </header>

      {communities.length === 0 ? (
        <div className="rounded border border-dashed border-bronze/30 bg-ink2 px-6 py-12 text-center">
          <p className="text-sm text-cream/60">
            No communities yet. Create one to start adding schools and POIs.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-bronze/20 rounded border border-bronze/30 bg-ink2">
          {communities.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/communities/${c.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-bronze/10"
              >
                <div>
                  <div className="text-sm font-medium text-cream">{c.name}</div>
                  <div className="text-xs text-cream/50">
                    {c.city ? `${c.city}, ${c.state}` : c.state} ·{' '}
                    <code className="text-cream/70">{c.slug}</code>
                  </div>
                </div>
                <span className="text-xs text-cream/40">edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
