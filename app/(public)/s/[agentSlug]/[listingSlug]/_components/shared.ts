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

/**
 * Demo "About this home" blurb — phase 40.3/40.4 info density.
 * Used when listing.description is empty. Single shared luxury-toned blurb;
 * stable per-listing variation could come later if needed.
 */
const ABOUT_VARIANTS: readonly string[] = [
  'A serene retreat tucked among mature trees, this home blends quiet craftsmanship with a layout designed for both everyday rhythm and effortless entertaining. Light pours through oversized glazing, oak floors run wall to wall, and the kitchen opens onto a covered terrace built for slow mornings and long evenings.',
  'Set behind a hedged drive, the residence balances architectural restraint with warm, lived-in materiality. White-oak millwork, Venetian plaster, and chef-grade appliances anchor the main level; upstairs, a primary suite with dual closets and a stone-clad spa bath looks out over the gardens.',
  'A thoughtful renovation pairs original bones with modern systems — new HVAC, refreshed roof, and seismic-retrofit foundation. The result feels timeless rather than trendy: gracious proportions, soft natural light, and an indoor-outdoor flow that quietly elevates the daily routine.',
];

export function aboutBlurbFor(seed: string, real: string[] | null): string {
  const realText = (real ?? []).filter((s) => s && s.trim().length > 0).join(' ').trim();
  if (realText.length > 80) return realText;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ABOUT_VARIANTS[Math.abs(h) % ABOUT_VARIANTS.length] ?? ABOUT_VARIANTS[0]!;
}

/**
 * Fake nearby landmarks for the community block. Real schema doesn't carry
 * "0.3 mi to X" structured data yet — this is demo-only fluff to show the
 * shape of the eventual feature.
 */
export const DEMO_LANDMARKS: readonly { distance: string; name: string }[] = [
  { distance: '0.3 mi', name: 'Lincoln Elementary' },
  { distance: '0.5 mi', name: 'Whole Foods Market' },
  { distance: '8 min walk', name: 'BART station' },
];

/** One-line agent bio for the contact card. Demo placeholder. */
export function agentBlurbFor(name: string): string {
  return `${name.split(' ')[0]} represents distinctive homes across the Peninsula and East Bay.`;
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
