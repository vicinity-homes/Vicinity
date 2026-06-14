'use client';

/**
 * CommunityVideoPanel — Phase 4.5; Phase 22 (2026-06-14) re-categorized;
 * Phase 23 (2026-06-14) trimmed link-to-school / link-to-POI sections and
 * replaced the lat/lng UI with a single human-readable `address` field.
 *
 * Why the cuts (Phase 23): linking a video to a specific school / POI row
 * was rarely used and double-coupled the picker with `kind`. The 12-cat
 * picker already says "this is a school_run" — agents don't need to also
 * pick which school. Geo coords are still captured (silently, via browser
 * geolocation) so the platform-wide Nearby query keeps working, but the
 * UI never shows them.
 */

import { deleteCommunityVideo } from '@/app/dashboard/communities/actions';
import {
  type CommunityKind,
  type UploadedVideo,
  VideoUploader,
} from '@/components/dashboard/VideoUploader';
import { thumbnailUrl } from '@/lib/cloudflare/stream';
import {
  COMMUNITY_VIDEO_CATEGORIES,
  type CommunityVideoCategoryId,
  getCategoryMeta,
  legacyKindForCategory,
} from '@/lib/zod/community-video-categories';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export interface CommunityVideoRow {
  id: string;
  cf_video_id: string;
  kind: string;
  category?: string | null;
  category_needs_review?: boolean | null;
  school_id: string | null;
  poi_id: string | null;
  title: string | null;
  status: string;
  created_at: string;
}

const POLL_MS = 5000;

const BUCKET_A = COMMUNITY_VIDEO_CATEGORIES.filter((c) => c.bucket === 'a');
const BUCKET_B = COMMUNITY_VIDEO_CATEGORIES.filter((c) => c.bucket === 'b');

export function CommunityVideoPanel({
  communityId,
  initialVideos,
}: {
  communityId: string;
  initialVideos: CommunityVideoRow[];
}) {
  const router = useRouter();
  const [videos, setVideos] = useState<CommunityVideoRow[]>(initialVideos);
  const [category, setCategory] = useState<CommunityVideoCategoryId>('walk_the_block');
  const [address, setAddress] = useState<string>('');
  // Phase 23: silent geo. Captured once on mount; never surfaced in the UI.
  // If the user denies geolocation we just don't send lat/lng — the row still
  // saves with `address` (or neither, in which case Nearby just skips it).
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const meta = getCategoryMeta(category);
  const kind: CommunityKind = legacyKindForCategory(category);

  // Silent geolocation on mount. Browser will prompt once; if the user
  // denies, we proceed without coords — no UI flag, no error toast.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
      },
      () => {
        // silent; coords stay undefined
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/video/list?community_id=${communityId}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { videos: CommunityVideoRow[] };
      setVideos(json.videos);
    } catch {
      // network blip
    }
  }, [communityId]);

  useEffect(() => {
    const hasProcessing = videos.some((v) => v.status === 'processing');
    if (!hasProcessing) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [videos, refresh]);

  function handleUploaded(_video: UploadedVideo) {
    refresh();
  }

  async function handleDelete(videoId: string) {
    if (!confirm('Delete this community video?')) return;
    setError(null);
    const result = await deleteCommunityVideo(videoId, communityId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const target = {
    scope: 'community' as const,
    communityId,
    kind,
    category,
    ...(typeof lat === 'number' ? { lat } : {}),
    ...(typeof lng === 'number' ? { lng } : {}),
    ...(address.trim() !== '' ? { address: address.trim() } : {}),
  };

  return (
    <section className="rounded border border-bronze/30 bg-ink2 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Upload a video</h2>
        <span className="text-xs text-cream/50">{videos.length} uploaded</span>
      </div>

      {/* ── Category picker — Phase 22 ───────────────────────────── */}
      <div className="mb-4 space-y-3">
        <CategoryGroup
          title="Only on Vicinity"
          subtitle="Scarce content nobody else has"
          items={BUCKET_A}
          selected={category}
          onPick={setCategory}
        />
        <CategoryGroup
          title="Real look at the data"
          subtitle="The visceral layer over numbers buyers can already find"
          items={BUCKET_B}
          selected={category}
          onPick={setCategory}
        />
        <div className="rounded border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-cream/80">
          <span className="font-medium text-gold">{meta.label}</span>
          <span className="text-cream/60"> — {meta.blurb}.</span>
          <div className="mt-1 text-[11px] text-cream/60">
            <span className="font-medium">Must include:</span> {meta.hardRule}
          </div>
        </div>
      </div>

      {/* ── Address (Phase 23) ───────────────────────────────────── */}
      <div className="mb-4">
        <label htmlFor="cv-address" className="mb-1 block text-xs font-medium text-cream/70">
          Address <span className="text-cream/40">(optional)</span>
        </label>
        <input
          id="cv-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Smith Park, 123 Main St — or leave blank to use current location"
          maxLength={200}
          className="w-full rounded border border-bronze/30 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
        <p className="mt-1 text-[11px] text-cream/50">
          What's in the video — readable for buyers. If left blank, we use your phone's location
          quietly so this still shows up in Nearby.
        </p>
      </div>

      <VideoUploader target={target} onUploaded={handleUploaded} />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {videos.length > 0 && (
        <details className="mt-4" open>
          <summary className="cursor-pointer select-none text-xs uppercase tracking-wide text-cream/60 hover:text-cream">
            Already uploaded ({videos.length})
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((v) => {
              const displayCategory = v.category
                ? (COMMUNITY_VIDEO_CATEGORIES.find((c) => c.id === v.category)?.label ?? v.category)
                : v.kind;
              return (
                <li key={v.id} className="flex gap-3 rounded border border-bronze/20 p-3 text-sm">
                  <div
                    className="h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-ink"
                    style={{
                      backgroundImage: `url(${thumbnailUrl(v.cf_video_id)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-cream">{v.title ?? '(untitled)'}</div>
                    <div className="text-xs text-cream/50">
                      {displayCategory}
                      {v.category_needs_review ? (
                        <span className="ml-1 rounded bg-yellow-500/20 px-1 py-0.5 text-[10px] text-yellow-300">
                          needs review
                        </span>
                      ) : null}
                      {' · '}
                      <span
                        className={
                          v.status === 'ready'
                            ? 'text-emerald-400'
                            : v.status === 'error'
                              ? 'text-red-400'
                              : 'text-cream/50'
                        }
                      >
                        {v.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="mt-2 text-xs text-red-400 hover:underline"
                    >
                      delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

// ─── helpers ─────────────────────────────────────────────────────

function CategoryGroup({
  title,
  subtitle,
  items,
  selected,
  onPick,
}: {
  title: string;
  subtitle: string;
  items: readonly { id: CommunityVideoCategoryId; label: string; blurb: string }[];
  selected: CommunityVideoCategoryId;
  onPick: (id: CommunityVideoCategoryId) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold">{title}</span>
        <span className="text-[11px] text-cream/50">{subtitle}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((c) => {
          const isSel = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className={[
                'rounded border px-2 py-2 text-left text-xs transition',
                isSel
                  ? 'border-gold bg-gold/10 text-cream'
                  : 'border-bronze/30 bg-ink text-cream/80 hover:border-gold/60 hover:text-cream',
              ].join(' ')}
            >
              <div className="font-medium">{c.label}</div>
              <div className="mt-0.5 text-[11px] text-cream/50">{c.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
