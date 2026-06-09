import { describe, expect, it, vi } from 'vitest';
import { getListingStats, getRollupStats } from '../listing-stats';

interface EventRow {
  event_type: string;
  session_id: string | null;
}

function fakeSupabase(events: EventRow[], leadsCount: number) {
  // events query path: .from('events').select(...).eq(...) | .in(...)  → resolves to {data, error}
  // leads query path:  .from('leads').select('id', {head, count}).eq/in(...) → {count, error}

  const eventsSelectChain = {
    eq: vi.fn().mockResolvedValue({ data: events, error: null }),
    in: vi.fn().mockResolvedValue({ data: events, error: null }),
  };

  const leadsSelectChain = {
    eq: vi.fn().mockResolvedValue({ count: leadsCount, error: null }),
    in: vi.fn().mockResolvedValue({ count: leadsCount, error: null }),
  };

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'events') {
      return { select: vi.fn().mockReturnValue(eventsSelectChain) };
    }
    if (table === 'leads') {
      return { select: vi.fn().mockReturnValue(leadsSelectChain) };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { from };
}

const LID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('getListingStats', () => {
  it('counts page_view, video_complete, unique sessions, leads', async () => {
    const events: EventRow[] = [
      { event_type: 'page_view', session_id: 's1' },
      { event_type: 'page_view', session_id: 's1' }, // same session
      { event_type: 'page_view', session_id: 's2' },
      { event_type: 'card_view', session_id: 's2' },
      { event_type: 'video_complete', session_id: 's3' },
      { event_type: 'video_complete', session_id: 's3' },
      { event_type: 'lead_submit', session_id: 's4' }, // contributes to sessions only
      { event_type: 'page_view', session_id: null }, // null session ignored
    ];
    const sb = fakeSupabase(events, 2);
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    const stats = await getListingStats(sb as any, LID);
    expect(stats.pageViews).toBe(4); // 4 page_view rows including null-session one
    expect(stats.videoCompletes).toBe(2);
    expect(stats.uniqueSessions).toBe(4); // s1, s2, s3, s4
    expect(stats.leads).toBe(2);
    // 2 / 4 = 50.0%
    expect(stats.leadConversionPct).toBe(50);
  });

  it('handles zero events / zero leads', async () => {
    const sb = fakeSupabase([], 0);
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    const stats = await getListingStats(sb as any, LID);
    expect(stats).toEqual({
      pageViews: 0,
      uniqueSessions: 0,
      videoCompletes: 0,
      leads: 0,
      leadConversionPct: 0,
    });
  });

  it('rounds conversion to 1 decimal place', async () => {
    const events: EventRow[] = Array.from({ length: 7 }, (_, i) => ({
      event_type: 'page_view',
      session_id: `s${i}`,
    }));
    const sb = fakeSupabase(events, 1);
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    const stats = await getListingStats(sb as any, LID);
    // 1 / 7 = 14.285…% → 14.3
    expect(stats.leadConversionPct).toBe(14.3);
  });
});

describe('getRollupStats', () => {
  it('returns zeros when listingIds is empty', async () => {
    const sb = fakeSupabase([], 0);
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    const stats = await getRollupStats(sb as any, []);
    expect(stats.pageViews).toBe(0);
    expect(stats.leadConversionPct).toBe(0);
    expect(sb.from).not.toHaveBeenCalled(); // short-circuit
  });

  it('aggregates across multiple listings', async () => {
    const events: EventRow[] = [
      { event_type: 'page_view', session_id: 's1' },
      { event_type: 'page_view', session_id: 's2' },
      { event_type: 'video_complete', session_id: 's1' },
    ];
    const sb = fakeSupabase(events, 3);
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    const stats = await getRollupStats(sb as any, ['l1', 'l2']);
    expect(stats.pageViews).toBe(2);
    expect(stats.videoCompletes).toBe(1);
    expect(stats.uniqueSessions).toBe(2);
    expect(stats.leads).toBe(3);
  });
});
