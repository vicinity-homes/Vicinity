/**
 * Per-listing analytics aggregation. Phase 6.4a.
 *
 * Reads from `public.events` (RLS-scoped to the calling agent's owned
 * listings — see migration 0001). Returns the four numbers Vivian asked
 * for:
 *
 *   pageViews        — count of event_type='page_view' for this listing
 *   uniqueSessions   — count of distinct session_id across all events
 *   videoCompletes   — count of event_type='video_complete'
 *   leads            — count of rows in `leads` for this listing
 *
 * `leadConversion` is derived (leads / uniqueSessions) and surfaced as a
 * formatted string so the page component doesn't repeat the divide-by-zero
 * dance.
 *
 * Implementation: ONE select pulling event_type + session_id for the
 * listing, aggregated in JS. For internal-beta scale (≤1000 events/listing)
 * this is one round-trip vs four; if Phase 7+ scale exceeds ~10k
 * events/listing we'd push aggregation server-side via a Postgres function.
 *
 * The `leads` count is a separate `head:true count:exact` query — leads
 * live in their own table and are gated by a different RLS policy.
 *
 * Pure-ish: takes a Supabase client + listingId, returns stats. Caller
 * supplies the right client (cookie-anon for SSR routes, service-role for
 * cron/admin paths).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ListingStats {
  pageViews: number;
  uniqueSessions: number;
  videoCompletes: number;
  leads: number;
  leadConversionPct: number; // 0-100, rounded to 1 decimal
}

interface EventRow {
  event_type: string;
  session_id: string | null;
}

export async function getListingStats(
  supabase: SupabaseClient,
  listingId: string,
): Promise<ListingStats> {
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const eventsRes = await (supabase as any)
    .from('events')
    .select('event_type, session_id')
    .eq('listing_id', listingId);

  if (eventsRes.error) throw eventsRes.error;
  const rows: EventRow[] = (eventsRes.data ?? []) as EventRow[];

  let pageViews = 0;
  let videoCompletes = 0;
  const sessions = new Set<string>();
  for (const r of rows) {
    if (r.event_type === 'page_view') pageViews++;
    else if (r.event_type === 'video_complete') videoCompletes++;
    if (r.session_id) sessions.add(r.session_id);
  }

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const leadsRes = await (supabase as any)
    .from('leads')
    .select('id', { head: true, count: 'exact' })
    .eq('listing_id', listingId);
  if (leadsRes.error) throw leadsRes.error;
  const leads = (leadsRes.count ?? 0) as number;

  const uniqueSessions = sessions.size;
  const leadConversionPct =
    uniqueSessions > 0 ? Math.round((leads / uniqueSessions) * 1000) / 10 : 0;

  return { pageViews, uniqueSessions, videoCompletes, leads, leadConversionPct };
}

/**
 * Aggregate stats across multiple listings (dashboard rollup). Single events
 * query with `in('listing_id', ids)`, then sum into one shape.
 *
 * Returns an empty zero-stats object if `listingIds` is empty.
 */
export async function getRollupStats(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<ListingStats> {
  if (listingIds.length === 0) {
    return {
      pageViews: 0,
      uniqueSessions: 0,
      videoCompletes: 0,
      leads: 0,
      leadConversionPct: 0,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const eventsRes = await (supabase as any)
    .from('events')
    .select('event_type, session_id')
    .in('listing_id', listingIds);
  if (eventsRes.error) throw eventsRes.error;
  const rows: EventRow[] = (eventsRes.data ?? []) as EventRow[];

  let pageViews = 0;
  let videoCompletes = 0;
  const sessions = new Set<string>();
  for (const r of rows) {
    if (r.event_type === 'page_view') pageViews++;
    else if (r.event_type === 'video_complete') videoCompletes++;
    if (r.session_id) sessions.add(r.session_id);
  }

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const leadsRes = await (supabase as any)
    .from('leads')
    .select('id', { head: true, count: 'exact' })
    .in('listing_id', listingIds);
  if (leadsRes.error) throw leadsRes.error;
  const leads = (leadsRes.count ?? 0) as number;

  const uniqueSessions = sessions.size;
  const leadConversionPct =
    uniqueSessions > 0 ? Math.round((leads / uniqueSessions) * 1000) / 10 : 0;

  return { pageViews, uniqueSessions, videoCompletes, leads, leadConversionPct };
}
