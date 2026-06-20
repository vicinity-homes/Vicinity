'use client';

/**
 * PhotoPanelPrefillBridge — Phase 43.6 (2026-06-20).
 *
 * Thin client wrapper around <PhotoPanel> that reads `?prefill=<id>` from
 * the URL on first render and pulls the matching File[] out of the
 * upload-prefill-store. The PhotoPanel itself doesn't know about the
 * URL — it just receives `prefillFiles`. Keeping the URL read in this
 * bridge means the panel stays a plain "given files, upload them"
 * component that the rest of the codebase can use without the FAB
 * coupling.
 *
 * Why a bridge: /edit is a server component (it does Supabase reads),
 * and `useSearchParams` is a client-only hook. Server components can't
 * touch the in-memory File[] store anyway — those File objects only
 * exist in the SPA bundle. So the bridge is the seam.
 */
import { consumePrefill } from '@/app/_components/upload-prefill-store';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { type ListingPhotoRow, PhotoPanel } from './PhotoPanel';

export function PhotoPanelPrefillBridge({
  listingId,
  initialPhotos,
  initialCoverPhotoId,
}: {
  listingId: string;
  initialPhotos: ListingPhotoRow[];
  initialCoverPhotoId: string | null;
}) {
  const searchParams = useSearchParams();
  // Lazy-init so consumePrefill (which mutates the Map) only runs once,
  // even under React's StrictMode double-mount in dev.
  const [prefillFiles] = useState<File[] | null>(() => {
    const id = searchParams?.get('prefill');
    if (!id) return null;
    return consumePrefill(id);
  });
  return (
    <PhotoPanel
      listingId={listingId}
      initialPhotos={initialPhotos}
      initialCoverPhotoId={initialCoverPhotoId}
      prefillFiles={prefillFiles ?? undefined}
    />
  );
}
