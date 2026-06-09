/**
 * Dashboard /leads — Phase 5.5.
 *
 * Server-side: fetch agent's leads (RLS scopes to own agent), hydrate as
 * `initialLeads` to the LeadsLive client component which subscribes to
 * Realtime INSERTs + polls as fallback (three-layer freshness pattern,
 * see DEVLOG Phase 2.4 hotfix).
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { type LeadRow, LeadsLive } from './leads-live';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fdashboard%2Fleads');

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data } = (await (supabase as any)
    .from('leads')
    .select(
      'id, name, email, phone, message, source, notified_at, created_at, listing_id, listings(address, city, state, slug)',
    )
    .order('created_at', { ascending: false })
    .limit(200)) as { data: LeadRow[] | null };

  const initial = data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Link href="/dashboard" className="text-xs text-cream/60 hover:text-cream">
          ← Listings
        </Link>
      </div>

      <LeadsLive initial={initial} />
    </div>
  );
}
