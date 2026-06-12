/**
 * `/nearby` — Phase 11 real implementation (2026-06-12).
 *
 * Buyer/agent (or anon) views content within X miles of their current
 * location. Default 10 mi, slider to 1..50 mi.
 *
 * Flow:
 *   1. Mount → request browser geolocation (one-time prompt).
 *   2. On grant → GET /api/nearby?lat&lng&radius → render two grids:
 *        - Listings (linked to /v/{a}/{l})
 *        - Community videos (linked to /v/{a}/{l} via community → not yet,
 *          for V1 just show the thumbnail; clicking is deferred).
 *   3. Slider change → re-fetch.
 *
 * Permissions: if user denies geolocation, surface a manual lat/lng input
 * (mirrors the agent upload form pattern).
 */

import { NearbyClient } from './NearbyClient';

export const metadata = {
  title: 'Nearby · Vicinity',
};

export default function NearbyPage() {
  return (
    <main className="min-h-dvh bg-ink pb-24 text-cream md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-serif text-2xl">Nearby</h1>
        <p className="mt-1 text-cream/60 text-sm">
          Listings and community videos within <span className="text-cream/80">your radius</span>.
          Default 10 miles.
        </p>
        <NearbyClient />
      </div>
    </main>
  );
}
