/**
 * FAKE — phase35 will replace
 * ===========================
 *
 * Per-community fake stats keyed by slug. Used by Scenario A's CommunitySheet,
 * Scenario B's BrowseTabs Communities cards, and the L1 community video feed
 * legend. We surface these in the V1 buyer experience NOW (phase34b) because
 * the prototype information density is the product goal — but the columns
 * don't exist in `communities` yet.
 *
 * In phase35 these all become real columns:
 *   - rating          → communities.rating numeric(2,1)        (manual or computed from saved/views)
 *   - schoolScore     → communities.school_score numeric(2,1)  (GreatSchools API or admin entry)
 *   - commuteAnchor   → communities.commute_anchor text        (e.g. "Seattle", "Microsoft")
 *   - commuteMinutes  → communities.commute_minutes int        (drive-time at peak)
 *   - medianPriceUsd  → communities.median_price_cents bigint  (cents → display)
 *   - areaSqMi        → communities.area_sq_mi numeric         (boundary-derived)
 *   - hostName        → join via communities.created_by → agents.full_name
 *   - hostYearsInArea → agents.years_in_area int               (new column)
 *
 * When phase35 lands:
 *   1. Migration adds columns + backfills these literals.
 *   2. `getCommunityFakeStats()` is replaced with a DB-backed selector.
 *   3. Callers stop importing this file. This file is deleted.
 *
 * Rule: DO NOT scatter fake values across components. Add new fields here.
 */

export type CommunityFakeStats = {
  rating: number;
  schoolScore: number;
  commuteAnchor: string;
  commuteMinutes: number;
  medianPriceUsd: number;
  areaSqMi: number;
  hostName: string;
  hostYearsInArea: number;
};

const DEFAULT_STATS: CommunityFakeStats = {
  rating: 4.7,
  schoolScore: 8.9,
  commuteAnchor: "downtown",
  commuteMinutes: 25,
  medianPriceUsd: 1_200_000,
  areaSqMi: 8,
  hostName: "Local host",
  hostYearsInArea: 5,
};

const BY_SLUG: Record<string, Partial<CommunityFakeStats>> = {
  "bellevue-eastside": {
    rating: 4.8,
    schoolScore: 9.2,
    commuteAnchor: "Seattle",
    commuteMinutes: 22,
    medianPriceUsd: 1_400_000,
    areaSqMi: 12,
    hostName: "Mark Liu",
    hostYearsInArea: 8,
  },
  "kirkland-houghton": {
    rating: 4.6,
    schoolScore: 8.7,
    commuteAnchor: "Seattle",
    commuteMinutes: 28,
    medianPriceUsd: 1_100_000,
    areaSqMi: 9,
  },
  "mercer-island": {
    rating: 4.9,
    schoolScore: 9.5,
    commuteAnchor: "Seattle",
    commuteMinutes: 18,
    medianPriceUsd: 2_300_000,
    areaSqMi: 6,
  },
  "redmond-education-hill": {
    rating: 4.5,
    schoolScore: 9.0,
    commuteAnchor: "Microsoft",
    commuteMinutes: 12,
    medianPriceUsd: 1_200_000,
    areaSqMi: 7,
  },
  "sammamish-plateau": {
    rating: 4.7,
    schoolScore: 9.3,
    commuteAnchor: "Bellevue",
    commuteMinutes: 20,
    medianPriceUsd: 1_600_000,
    areaSqMi: 11,
  },
  "issaquah-highlands": {
    rating: 4.4,
    schoolScore: 8.8,
    commuteAnchor: "Bellevue",
    commuteMinutes: 25,
    medianPriceUsd: 1_000_000,
    areaSqMi: 8,
  },
};

export function getCommunityFakeStats(slug: string | null | undefined): CommunityFakeStats {
  if (!slug) return DEFAULT_STATS;
  const override = BY_SLUG[slug];
  return override ? { ...DEFAULT_STATS, ...override } : DEFAULT_STATS;
}

/**
 * Format median price like "$1.4M" / "$950K".
 * Used in sheet stats and Communities grid badges.
 */
export function formatMedianPriceShort(usd: number): string {
  if (usd >= 1_000_000) {
    const m = usd / 1_000_000;
    // 1.4M not 1.40M, 2M not 2.0M
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (usd >= 1_000) {
    const k = Math.round(usd / 1_000);
    return `$${k}K`;
  }
  return `$${usd}`;
}
