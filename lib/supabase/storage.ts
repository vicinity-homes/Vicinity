/**
 * Helpers for the `listing-photos` Supabase Storage bucket.
 *
 * Phase 10 (2026-06-12). Two responsibilities:
 *   - `photoPublicUrl(path)` → the public URL the browser/CDN serves.
 *   - `nextPhotoStoragePath(listingId, file)` → deterministic path for a
 *     fresh upload. `{listingId}/{uuid}.{ext}` — matches the storage RLS
 *     policy (`split_part(name, '/', 1)::uuid = listing_id`).
 *
 * Bucket is configured public, so we build the URL from
 * `NEXT_PUBLIC_SUPABASE_URL` — no signed URLs, no per-request auth.
 */

const BUCKET = 'listing-photos';

export function photoPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    // In SSR contexts we always have it; this branch is just defensive.
    return `/storage/${BUCKET}/${storagePath}`;
  }
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export function nextPhotoStoragePath(listingId: string, fileName: string): string {
  const ext = (fileName.split('.').pop() ?? 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  // Use crypto.randomUUID — available in browsers and Node 19+.
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${listingId}/${id}.${safeExt}`;
}

export const LISTING_PHOTOS_BUCKET = BUCKET;
