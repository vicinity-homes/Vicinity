/**
 * GET /api/geo?state=GA
 *
 * Phase 58 (2026-06-26): backs the State → County / City cascading
 * dropdowns on the community editor. Returns `{ counties, cities }`
 * for one USPS state code from a vendored Census 2024 Gazetteer slice
 * (~486 KB total across all 52 jurisdictions, served one slice at a
 * time so the client only pays for the state it needs).
 *
 * Public — geographic reference data, no PII. Cached aggressively
 * (immutable for a year, the Gazetteer only updates annually).
 */

import { NextResponse } from 'next/server';

import usGeo from '@/lib/data/us-geo.json';
import { US_STATE_CODES } from '@/lib/data/us-states';

type GeoSlice = { counties: string[]; cities: string[] };
const GEO = usGeo as Record<string, GeoSlice>;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('state') ?? '').trim().toUpperCase();
  if (!raw || !US_STATE_CODES.has(raw)) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 });
  }
  const slice = GEO[raw];
  if (!slice) return NextResponse.json({ counties: [], cities: [] });
  return NextResponse.json(slice, {
    headers: {
      // Census Gazetteer updates ~yearly; cache hard at the edge.
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
}
