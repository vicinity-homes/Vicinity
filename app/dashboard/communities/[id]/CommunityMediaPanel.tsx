/**
 * CommunityMediaPanel — unified Videos + Photos card for the community
 * agent hub (Phase 50, 2026-06-22).
 *
 * Why: phase 50 mirrors the listing edit hub (4 icon tabs: Details / Media
 * / Marketing / Analytics). The listing hub has a single "Media" tab that
 * stacks videos and photos; this is the community equivalent. Implemented
 * as a thin server component that arranges the existing pieces:
 *
 *   ┌─ Videos (N) ─────────────────────────────────┐
 *   │   "+ Upload video" → /upload subroute        │
 *   │   <CommunityVideoManageList />               │
 *   └──────────────────────────────────────────────┘
 *   ┌─ Photos (N) ─────────────────────────────────┐
 *   │   <CommunityPhotosTab />                     │
 *   └──────────────────────────────────────────────┘
 *
 * We deliberately keep videos in a manage-list (non-uploader) flow because
 * the community video pipeline goes through a category-picker subroute
 * (`/dashboard/communities/[id]/upload`) that doesn't fit a single inline
 * file picker. Photos remain inline (CommunityPhotosTab is already an
 * inline manager).
 *
 * No props this component owns — everything is forwarded.
 */

import Link from 'next/link';

import type { CommunityPhotoRow } from './CommunityPhotoPanel';
import { CommunityPhotosTab } from './CommunityPhotosTab';
import { CommunityVideoManageList, type ManageVideoRow } from './CommunityVideoManageList';

interface Props {
  communityId: string;
  videos: ManageVideoRow[];
  myAgentId: string | null;
  photos: CommunityPhotoRow[];
}

export function CommunityMediaPanel({ communityId, videos, myAgentId, photos }: Props) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">
            Videos <span className="text-muted text-xs font-normal">({videos.length})</span>
          </h2>
          <Link
            href={`/dashboard/communities/${communityId}/upload`}
            className="rounded bg-ink px-3 py-1.5 font-medium text-cream text-xs transition hover:opacity-90"
          >
            + Upload video
          </Link>
        </div>
        <CommunityVideoManageList communityId={communityId} videos={videos} myAgentId={myAgentId} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">
            Photos <span className="text-muted text-xs font-normal">({photos.length})</span>
          </h2>
        </div>
        <CommunityPhotosTab communityId={communityId} initialPhotos={photos} />
      </section>
    </div>
  );
}
