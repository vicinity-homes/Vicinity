/**
 * GET /api/nearby?lat=&lng=&radius=
 *
 * Phase 11 (2026-06-12). Returns listings + community videos within
 * `radius` miles of the (lat, lng) the caller supplies. Public — no auth
 * required (browse/nearby is open to anonymous buyers per Phase 9.5).
 *
 * Distance algorithm: bbox prefilter via b-tree on (lat, lng), then
 * exact haversine in JS to drop bbox corners. Caps at 200 listings + 200
 * community videos to keep payload bounded.
 */

import { haversineMiles, latLngBoundingBox } from '@/lib/geo/distance';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const MAX_RADIUS_MI = 100; // sanity cap so a buggy client can't pull the whole table
const MIN_RADIUS_MI = 1;
const MAX_ROWS = 200;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latStr = url.searchParams.get('lat');
  const lngStr = url.searchParams.get('lng');
  const radiusStr = url.searchParams.get('radius') ?? '10';

  const lat = Number(latStr);
  const lng = Number(lngStr);
  const radius = Number(radiusStr);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(radius) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    radius < MIN_RADIUS_MI ||
    radius > MAX_RADIUS_MI
  ) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const bbox = latLngBoundingBox(lat, lng, radius);
  const supabase = await createClient();

  const [listingsResp, communityVidsResp] = await Promise.all([
    // biome-ignore lint/suspicious/noExplicitAny: stub generated types
    (supabase as any)
      .from('listings')
      .select(
        'id, slug, address, city, state, price, beds, baths, lat, lng, agent_id, agents!inner(slug, name)',
      )
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', bbox.minLat)
      .lte('lat', bbox.maxLat)
      .gte('lng', bbox.minLng)
      .lte('lng', bbox.maxLng)
      .limit(MAX_ROWS),
    // biome-ignore lint/suspicious/noExplicitAny: stub generated types
    (supabase as any)
      .from('community_videos')
      .select('id, cf_video_id, kind, title, lat, lng, status, community_id')
      .eq('status', 'ready')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', bbox.minLat)
      .lte('lat', bbox.maxLat)
      .gte('lng', bbox.minLng)
      .lte('lng', bbox.maxLng)
      .limit(MAX_ROWS),
  ]);

  const center = { lat, lng };

  type ListingRow = {
    id: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    price: number | null;
    beds: number | null;
    baths: number | null;
    lat: number;
    lng: number;
    agent_id: string;
    agents: { slug: string; name: string };
  };

  const listings = (listingsResp.data ?? [])
    .map((l: ListingRow) => ({
      ...l,
      distance: haversineMiles(center, { lat: l.lat, lng: l.lng }),
    }))
    .filter((l: ListingRow & { distance: number }) => l.distance <= radius)
    .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

  type CvRow = {
    id: string;
    cf_video_id: string;
    kind: string;
    title: string | null;
    lat: number;
    lng: number;
    community_id: string;
  };

  const communityVideos = (communityVidsResp.data ?? [])
    .map((v: CvRow) => ({ ...v, distance: haversineMiles(center, { lat: v.lat, lng: v.lng }) }))
    .filter((v: CvRow & { distance: number }) => v.distance <= radius)
    .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

  return NextResponse.json({
    listings,
    communityVideos,
    center,
    radius,
  });
}
