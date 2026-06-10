/**
 * Per-listing analytics aggregation. Phase 6.4a — Phase 8.5 added top-cards
 * + funnel breakdown.
 *
 * Reads from `public.events` (RLS-scoped to the calling agent's owned
 * listings — see migration 0001). Returns the four headline numbers Vivian
 * asked for plus richer breakdowns for the dashboard:
 *
 *   pageViews        — count of event_type='page_view' for this listing
 *   uniqueSessions   — count of distinct session_id across all events
 *   cardViews        — count of event_type='card_view' (Phase 8.5)
 *   videoCompletes   — count of event_type='video_complete'
 *   leads            — count of rows in `leads` for this listing
 *   topCards         — Map<card_id, view_count>, sorted desc, top 10 (8.5)
 *
 * `leadConversion` is derived (leads / uniqueSessions) and surfaced as a
 * formatted string so the page component doesn't repeat the divide-by-zero
 * dance.
 *
 * Implementation: ONE select pulling event_type + session_id + card_id for
 * the listing, aggregated in JS. For internal-beta scale (≤1000 events/listing)
 * this is one round-trip vs four.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// biome-ignore lint/suspicious/noExplicitAny: opaque rows
type AnyClient = SupabaseClient<any, any, any, any, any>;

export interface TopCardEntry {
  cardId: string;
  views: number;
}

export interface ListingStats {
  pageViews: number;
  uniqueSessions: number;
  cardViews: number;
  videoCompletes: number;
  leads: number;
  leadConversionPct: number; // 0-100, rounded to 1 decimal
  topCards: TopCardEntry[];
}

interface EventRow {
  event_type: string;
  session_id: string | null;
  card_id: string | null;
}

function emptyStats(): ListingStats {
  return {
    pageViews: 0,
    uniqueSessions: 0,
    cardViews: 0,
    videoCompletes: 0,
    leads: 0,
    leadConversionPct: 0,
    topCards: [],
  };
}

function aggregate(rows: EventRow[], leads: number): ListingStats {
  let pageViews = 0;
  let cardViews = 0;
  let videoCompletes = 0;
  const sessions = new Set<string>();
  const cardCounts = new Map<string, number>();

  for (const r of rows) {
    if (r.event_type === 'page_view') pageViews++;
    else if (r.event_type === 'card_view') cardViews++;
    else if (r.event_type === 'video_complete') videoCompletes++;
    if (r.session_id) sessions.add(r.session_id);
    if (r.event_type === 'card_view' && r.card_id) {
      cardCounts.set(r.card_id, (cardCounts.get(r.card_id) ?? 0) + 1);
    }
  }

  const topCards: TopCardEntry[] = Array.from(cardCounts.entries())
    .map(([cardId, views]) => ({ cardId, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const uniqueSessions = sessions.size;
  const leadConversionPct =
    uniqueSessions > 0 ? Math.round((leads / uniqueSessions) * 1000) / 10 : 0;

  return {
    pageViews,
    uniqueSessions,
    cardViews,
    videoCompletes,
    leads,
    leadConversionPct,
    topCards,
  };
}

export async function getListingStats(
  supabase: AnyClient,
  listingId: string,
): Promise<ListingStats> {
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const eventsRes = await (supabase as any)
    .from('events')
    .select('event_type, session_id, card_id')
    .eq('listing_id', listingId);
  if (eventsRes.error) throw eventsRes.error;
  const rows: EventRow[] = (eventsRes.data ?? []) as EventRow[];

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const leadsRes = await (supabase as any)
    .from('leads')
    .select('id', { head: true, count: 'exact' })
    .eq('listing_id', listingId);
  if (leadsRes.error) throw leadsRes.error;
  const leads = (leadsRes.count ?? 0) as number;

  return aggregate(rows, leads);
}

/**
 * Aggregate stats across multiple listings (dashboard rollup). Single events
 * query with `in('listing_id', ids)`, then sum into one shape.
 */
export async function getRollupStats(
  supabase: AnyClient,
  listingIds: string[],
): Promise<ListingStats> {
  if (listingIds.length === 0) return emptyStats();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const eventsRes = await (supabase as any)
    .from('events')
    .select('event_type, session_id, card_id')
    .in('listing_id', listingIds);
  if (eventsRes.error) throw eventsRes.error;
  const rows: EventRow[] = (eventsRes.data ?? []) as EventRow[];

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const leadsRes = await (supabase as any)
    .from('leads')
    .select('id', { head: true, count: 'exact' })
    .in('listing_id', listingIds);
  if (leadsRes.error) throw leadsRes.error;
  const leads = (leadsRes.count ?? 0) as number;

  return aggregate(rows, leads);
}
