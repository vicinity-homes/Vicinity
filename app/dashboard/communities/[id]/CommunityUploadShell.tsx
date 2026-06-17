'use client';

/**
 * CommunityUploadShell — Phase 25 (2026-06-14); Phase 35.2 (2026-06-17)
 * swapped the inline 12-card grid for the shared <CategoryPicker> so the
 * create flow gets the mobile 2-step (bucket → category) treatment.
 *
 * Owns the shared category state used by BOTH the video panel and the photo
 * panel below. Same category drives both uploads, so an agent can drop a
 * video and a stack of photos in one session without re-picking the
 * category twice.
 */

import {
  CommunityPhotoPanel,
  type CommunityPhotoRow,
} from '@/app/dashboard/communities/[id]/CommunityPhotoPanel';
import { CategoryPicker } from './CategoryPicker';
import {
  CommunityVideoPanel,
  type CommunityOption,
  type CommunityVideoRow,
} from './CommunityVideoPanel';
import { type CommunityVideoCategoryId } from '@/lib/zod/community-video-categories';
import { useState } from 'react';

export function CommunityUploadShell({
  communityId,
  initialVideos,
  initialPhotos,
  availableCommunities,
}: {
  communityId: string;
  initialVideos: CommunityVideoRow[];
  initialPhotos: CommunityPhotoRow[];
  availableCommunities: CommunityOption[];
}) {
  const [category, setCategory] = useState<CommunityVideoCategoryId>('walk_the_block');

  return (
    <div className="space-y-4">
      {/* Shared category picker — drives both video + photo upload below.
       * The picker now shows label / blurb / hard rule inline (chip cloud
       * + spec card), so we don't double up with our own callout box. */}
      <section className="rounded border border-bronze/30 bg-ink2 p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-cream">Category</div>
        <CategoryPicker mode="create" selected={category} onPick={setCategory} />
        <p className="mt-3 text-[11px] text-cream/50">
          Applies to both video and photos uploaded below.
        </p>
      </section>

      <CommunityVideoPanel
        communityId={communityId}
        initialVideos={initialVideos}
        category={category}
        availableCommunities={availableCommunities}
      />

      <CommunityPhotoPanel
        communityId={communityId}
        initialPhotos={initialPhotos}
        category={category}
      />
    </div>
  );
}
