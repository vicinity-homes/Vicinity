/**
 * Shared helpers for the /s/ showcase poster styles.
 *
 * One source of truth for: cover URL resolution (always via demo-media),
 * formatted price/specs strings, community blurb, CTA URLs.
 *
 * All four styles import from this file. If you find yourself reading
 * `listing.cover_url` or building a `cf_video_id` URL inside a Style*.tsx,
 * stop and add it here instead — the showcase route MUST route every
 * image/video through demo-media (see lib/demo-media.ts).
 */

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { demoCoverFor, demoPhotosFor, demoVideoFor } from '@/lib/demo-media';
import type { ListingFeedBundle } from '@/lib/listing-feed/load';
import { photoPublicUrl } from '@/lib/supabase/storage';

export type ShowcaseListingPhoto = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

export interface ShowcaseData {
  bundle: ListingFeedBundle;
  /** Resolved hero image URL (always via demo-media). Never null. */
  heroImage: string;
  /** Optional hero video MP4 URL (demo-media only). null if no override or no listing video. */
  heroVideo: string | null;
  /** Up to 6 album photos (demo-media curated). */
  album: string[];
  /** Optional community photo (curated). null if no community attached. */
  communityImage: string | null;
}

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

export function buildShowcaseData(
  bundle: ListingFeedBundle,
  photos: ShowcaseListingPhoto[],
): ShowcaseData {
  const { listing, listingVideos, community } = bundle;

  // Hero image priority: real cover_url → first listing video thumbnail →
  // first photo public URL → fallback. Then ALWAYS round-trip through
  // demoCoverFor() so the demo override fires.
  let realCover: string | null = listing.cover_url ?? null;
  if (!realCover && listingVideos[0]) {
    try {
      realCover = thumbnailUrl(listingVideos[0].cf_video_id);
    } catch {
      realCover = null;
    }
  }
  if (!realCover && photos[0]) {
    realCover = photoPublicUrl(photos[0].storage_path);
  }
  const heroImage = demoCoverFor(listing.id, realCover) ?? FALLBACK_HERO;

  // Hero video: only set if there's a real listing video; demoVideoFor will
  // map the seed to a curated MP4 in demo mode (always returns null when
  // demo mode is off — production behavior preserved).
  let heroVideo: string | null = null;
  const firstVideo = listingVideos[0];
  if (firstVideo) {
    heroVideo = demoVideoFor(firstVideo.cf_video_id, 'home', listing.id);
  }

  const realPhotoUrls = photos.map((p) => photoPublicUrl(p.storage_path));
  const album = demoPhotosFor(listing.id, realPhotoUrls);

  const communityImage = community ? (demoCoverFor(community.id, null) ?? null) : null;

  return {
    bundle,
    heroImage,
    heroVideo,
    album,
    communityImage,
  };
}

export function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `$${price.toLocaleString()}`;
}

export function formatSpecs(
  beds: number | null,
  baths: number | null,
  sqft: number | null,
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (beds != null) out.push({ label: 'Bedrooms', value: String(beds) });
  if (baths != null) out.push({ label: 'Bathrooms', value: String(baths) });
  if (sqft != null) out.push({ label: 'Sq ft', value: sqft.toLocaleString() });
  return out;
}

/** Trim/clip community description to a single short blurb (≤ ~140 chars). */
export function communityBlurb(description: string | null): string | null {
  if (!description) return null;
  const clean = description.trim().replace(/\s+/g, ' ');
  if (clean.length <= 140) return clean;
  return `${clean.slice(0, 137).trimEnd()}…`;
}

export function listingFullUrl(agentSlug: string, listingSlug: string): string {
  return `/v/${agentSlug}/${listingSlug}`;
}

export function communityFullUrl(communitySlug: string): string {
  return `/c/${communitySlug}`;
}

export function agentFullUrl(agentSlug: string): string {
  return `/a/${agentSlug}`;
}
