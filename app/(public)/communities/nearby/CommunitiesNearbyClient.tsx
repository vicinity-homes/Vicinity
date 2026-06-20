'use client';

/**
 * CommunitiesNearbyClient — geolocation-driven communities-by-distance grid.
 *
 * Phase 45 (2026-06-20). Mirrors NearbyClient's geolocation/preference
 * flow exactly (radius from `vicinity:nearby_radius`, manual fallback
 * when geolocation is denied) but renders communities not listings.
 *
 * Owner clarification (2026-06-20): "community 没有坐标 但是里面的 video
 * 有坐标,nearby 给 videos 所在的 community". The /api/communities/nearby
 * endpoint handles that mapping; this client just renders the result with
 * a "0.4 mi away" badge per card.
 */

import { CommunityGrid } from '@/app/_components/CommunityGrid';
import type { CommunityListCard } from '@/lib/communities/list';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type CardWithDistance = CommunityListCard & { nearestVideoMi: number | null };

interface NearbyResponse {
  cards: CardWithDistance[];
  center: { lat: number; lng: number };
  radius: number;
}

const RADIUS_DEFAULT = 10;
const RADIUS_STORAGE_KEY = 'vicinity:nearby_radius';

function readStoredRadius(): number {
  if (typeof window === 'undefined') return RADIUS_DEFAULT;
  const raw = window.localStorage.getItem(RADIUS_STORAGE_KEY);
  if (!raw) return RADIUS_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 100) return RADIUS_DEFAULT;
  return n;
}

export function CommunitiesNearbyClient() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(RADIUS_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [needsManual, setNeedsManual] = useState(false);

  useEffect(() => {
    setRadius(readStoredRadius());
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNeedsManual(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setNeedsManual(true),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const fetchNearby = useCallback(async (c: { lat: number; lng: number }, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/communities/nearby?lat=${c.lat}&lng=${c.lng}&radius=${r}`,
        { cache: 'no-store' },
      );
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

  if (!coords && needsManual) {
    return (
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="mb-3 text-ink2">Couldn&apos;t read your location. Enter it manually:</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="lat (e.g. 33.838)"
              className="rounded border border-line bg-bg px-2 py-1 text-ink"
            />
            <input
              type="text"
              inputMode="decimal"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="lng (e.g. -84.378)"
              className="rounded border border-line bg-bg px-2 py-1 text-ink"
            />
          </div>
          <button
            type="button"
            onClick={applyManual}
            className="mt-3 rounded border border-line px-3 py-1 text-ink2 text-xs hover:border-line-strong hover:text-ink"
          >
            Apply
          </button>
          {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    );
  }

  if (!coords) {
    return <p className="px-6 py-12 text-center text-ink2 text-sm">Reading your location…</p>;
  }
  if (loading && !data) {
    return <p className="px-6 py-12 text-center text-ink2 text-sm">Searching nearby…</p>;
  }
  if (error) {
    return <p className="px-6 py-12 text-center text-red-400 text-sm">{error}</p>;
  }

  const cards = data?.cards ?? [];
  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-ink2">
          No community videos within {data?.radius ?? radius} mi.{' '}
          <Link href="/profile" className="text-ink hover:underline">
            Adjust your search radius in Preferences
          </Link>{' '}
          or check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <CommunityGrid communities={cards} />
    </div>
  );
}
