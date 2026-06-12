'use client';

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface NearbyListing {
  id: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  distance: number;
  agents: { slug: string; name: string };
}

interface NearbyCommunityVideo {
  id: string;
  cf_video_id: string;
  kind: string;
  title: string | null;
  distance: number;
}

interface NearbyResponse {
  listings: NearbyListing[];
  communityVideos: NearbyCommunityVideo[];
  center: { lat: number; lng: number };
  radius: number;
}

const RADIUS_DEFAULT = 10;
const RADIUS_MIN = 1;
const RADIUS_MAX = 50;

export function NearbyClient() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(RADIUS_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [needsManual, setNeedsManual] = useState(false);

  // Step 1 — try geolocation on mount.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNeedsManual(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setNeedsManual(true);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Step 2 — fetch whenever coords or radius change.
  const fetchNearby = useCallback(async (c: { lat: number; lng: number }, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nearby?lat=${c.lat}&lng=${c.lng}&radius=${r}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `nearby returned ${res.status}`);
      }
      const json = (await res.json()) as NearbyResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed_to_fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!coords) return;
    fetchNearby(coords, radius);
  }, [coords, radius, fetchNearby]);

  function applyManual() {
    const la = Number(manualLat);
    const ln = Number(manualLng);
    if (
      !Number.isFinite(la) ||
      !Number.isFinite(ln) ||
      la < -90 ||
      la > 90 ||
      ln < -180 ||
      ln > 180
    ) {
      setError('Enter valid lat (-90..90) and lng (-180..180).');
      return;
    }
    setCoords({ lat: la, lng: ln });
    setNeedsManual(false);
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Location status / manual fallback */}
      {!coords && needsManual && (
        <div className="rounded border border-bronze/30 bg-ink2 p-4 text-sm">
          <p className="mb-3 text-cream/80">Couldn't read your location. Enter it manually:</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="lat (e.g. 33.838)"
              className="rounded border border-bronze/30 bg-ink px-2 py-1 text-cream"
            />
            <input
              type="text"
              inputMode="decimal"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="lng (e.g. -84.378)"
              className="rounded border border-bronze/30 bg-ink px-2 py-1 text-cream"
            />
          </div>
          <button
            type="button"
            onClick={applyManual}
            className="mt-3 rounded border border-bronze/40 px-3 py-1 text-cream/80 text-xs hover:border-gold hover:text-cream"
          >
            Apply
          </button>
        </div>
      )}

      {!coords && !needsManual && <p className="text-cream/60 text-sm">Reading your location…</p>}

      {/* Radius slider */}
      {coords && (
        <div className="rounded border border-bronze/20 bg-ink2 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="radius" className="text-cream/70 text-xs uppercase tracking-wide">
              Radius
            </label>
            <span className="text-cream text-sm tabular-nums">{radius} mi</span>
          </div>
          <input
            id="radius"
            type="range"
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-bronze"
          />
          <div className="mt-1 flex justify-between text-cream/40 text-[11px]">
            <span>{RADIUS_MIN}mi</span>
            <span>{RADIUS_MAX}mi</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading && coords && <p className="text-cream/60 text-sm">Searching nearby…</p>}

      {/* Listings */}
      {data && (
        <section>
          <h2 className="mb-3 font-medium text-cream/80 text-sm uppercase tracking-wide">
            Listings ({data.listings.length})
          </h2>
          {data.listings.length === 0 ? (
            <p className="text-cream/50 text-sm">
              No listings within {data.radius} mi. Try a larger radius.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.listings.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/v/${l.agents.slug}/${l.slug}`}
                    className="block rounded border border-bronze/20 bg-ink2 p-3 transition hover:border-gold/40"
                  >
                    <div className="font-medium text-cream truncate">{l.address}</div>
                    <div className="text-cream/60 text-xs">
                      {l.city}, {l.state} · {l.distance.toFixed(1)} mi away
                    </div>
                    <div className="mt-1 text-cream/70 text-xs">
                      {l.price != null ? `$${l.price.toLocaleString()}` : 'Price on request'}
                      {l.beds != null && l.baths != null ? ` · ${l.beds}bd · ${l.baths}ba` : ''}
                    </div>
                    <div className="mt-1 text-cream/40 text-[11px]">by {l.agents.name}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Community videos */}
      {data && data.communityVideos.length > 0 && (
        <section>
          <h2 className="mb-3 font-medium text-cream/80 text-sm uppercase tracking-wide">
            Community videos ({data.communityVideos.length})
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.communityVideos.map((v) => (
              <li key={v.id} className="overflow-hidden rounded border border-bronze/20 bg-ink2">
                <div
                  className="aspect-video w-full bg-ink"
                  style={{
                    backgroundImage: `url(${thumbnailUrl(v.cf_video_id)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="p-2 text-xs">
                  <div className="truncate text-cream">{v.title ?? '(untitled)'}</div>
                  <div className="text-cream/50">
                    {v.kind} · {v.distance.toFixed(1)} mi
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
