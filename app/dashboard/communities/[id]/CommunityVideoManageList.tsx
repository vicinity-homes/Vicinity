'use client';

/**
 * CommunityVideoManageList — Phase 35.2 (2026-06-17).
 *
 * Inline manage of an existing community's videos directly on the editor
 * page (was previously: tap "Manage" → bounce to /upload, which is a
 * create surface, not a manage surface — unfair to agents who already have
 * 30 videos and want to hide one).
 *
 * Each row exposes:
 *   - thumbnail + title + current category + visibility chip
 *   - edit category   → expands a flat <CategoryPicker mode="edit"> sheet
 *   - mark private    → set visibility='private' (hidden from buyers)
 *   - archive         → set visibility='archived' (also hidden, dashboard parks them)
 *   - restore         → set visibility='public'
 *   - delete          → permanent (current behaviour)
 *
 * Buyers only ever see public videos (RLS in 0026). The dashboard list shows
 * everything so the agent can see what's hidden and unhide it.
 *
 * Why no virtual scroll: a single community averages <30 videos in V1.
 * If we hit performance issues we fold to a "show 20, load more" pager.
 */

import {
  type CommunityVideoVisibility,
  deleteCommunityVideo,
  updateCommunityVideoCategory,
  updateCommunityVideoVisibility,
} from '@/app/dashboard/communities/actions';
import { thumbnailUrl } from '@/lib/cloudflare/stream';
import {
  COMMUNITY_VIDEO_CATEGORIES,
  type CommunityVideoCategoryId,
} from '@/lib/zod/community-video-categories';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CategoryPicker } from './CategoryPicker';

export interface ManageVideoRow {
  id: string;
  cf_video_id: string;
  title: string | null;
  category: string | null;
  category_needs_review: boolean | null;
  status: string;
  visibility: 'public' | 'private' | 'archived';
  created_at: string;
  /** agents.id of the original uploader; null for legacy rows. */
  uploaded_by: string | null;
  uploaderSlug: string | null;
  uploaderDisplayName: string | null;
}

export function CommunityVideoManageList({
  communityId,
  videos,
  myAgentId,
}: {
  communityId: string;
  videos: ManageVideoRow[];
  /** Current viewer's agent.id. Drives owner-only edit/delete. */
  myAgentId: string | null;
}) {
  if (videos.length === 0) {
    return (
      <p className="text-xs text-muted">
        No videos yet. Tap <span className="text-ink2">+ Upload</span> to add one.
      </p>
    );
  }

  // Group by visibility so the working set (public) is on top, then private,
  // then archived parked at the bottom — agents can collapse archived once
  // they've stopped caring about a video without losing the file.
  const groups: Record<CommunityVideoVisibility, ManageVideoRow[]> = {
    public: [],
    private: [],
    archived: [],
  };
  for (const v of videos) groups[v.visibility].push(v);

  return (
    <div className="space-y-5">
      <Group
        label="Live"
        sublabel="Visible to buyers"
        items={groups.public}
        communityId={communityId}
        myAgentId={myAgentId}
      />
      {groups.private.length > 0 ? (
        <Group
          label="Private"
          sublabel="Hidden from buyers, kept in your dashboard"
          items={groups.private}
          communityId={communityId}
          myAgentId={myAgentId}
        />
      ) : null}
      {groups.archived.length > 0 ? (
        <Group
          label="Archived"
          sublabel="Parked — out of sight, not deleted"
          items={groups.archived}
          communityId={communityId}
          myAgentId={myAgentId}
          collapsible
        />
      ) : null}
    </div>
  );
}

function Group({
  label,
  sublabel,
  items,
  communityId,
  myAgentId,
  collapsible,
}: {
  label: string;
  sublabel: string;
  items: ManageVideoRow[];
  communityId: string;
  myAgentId: string | null;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink2">
            {label} <span className="ml-1 text-muted">({items.length})</span>
          </div>
          <div className="text-[11px] text-muted">{sublabel}</div>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="h-9 px-2 text-xs text-ink2 hover:text-ink"
          >
            {open ? 'hide' : 'show'}
          </button>
        ) : null}
      </div>
      {open ? (
        <ul className="space-y-2">
          {items.map((v) => (
            <ManageRow key={v.id} video={v} communityId={communityId} myAgentId={myAgentId} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ManageRow({
  video,
  communityId,
  myAgentId,
}: {
  video: ManageVideoRow;
  communityId: string;
  myAgentId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingCat, setEditingCat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 35.3: only the original uploader gets edit / hide / delete on a
  // row. Other agents see the same row for context (so they know what's
  // already been shot in this community) but every mutating action is
  // hidden — RLS now enforces the same rule server-side, this is just the
  // UI matching the policy so we don't show buttons that 403.
  const isOwner = myAgentId != null && video.uploaded_by != null && video.uploaded_by === myAgentId;
  // Legacy rows with NULL uploaded_by: nobody owns them, nobody can edit.
  // The "by …" caption stays blank for those.

  const catMeta = video.category
    ? COMMUNITY_VIDEO_CATEGORIES.find((c) => c.id === video.category)
    : undefined;

  function run<T>(
    fn: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function handleVisibility(next: CommunityVideoVisibility) {
    run(() => updateCommunityVideoVisibility(video.id, communityId, next));
  }

  function handleCategoryPick(id: CommunityVideoCategoryId) {
    setEditingCat(false);
    run(() => updateCommunityVideoCategory(video.id, communityId, id));
  }

  function handleDelete() {
    if (!confirm('Delete this community video? This cannot be undone.')) return;
    run(() => deleteCommunityVideo(video.id, communityId));
  }

  return (
    <li className="rounded border border-line bg-surface p-3">
      <div className="flex gap-3">
        <div
          className="h-16 w-24 shrink-0 overflow-hidden rounded bg-bg"
          style={{
            backgroundImage: `url(${thumbnailUrl(video.cf_video_id)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{video.title ?? '(untitled)'}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink2">
            <span className="rounded border border-line px-1.5 py-0.5">
              {catMeta?.label ?? video.category ?? 'uncategorized'}
            </span>
            {video.category_needs_review ? (
              <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-300">
                needs review
              </span>
            ) : null}
            <VisibilityChip visibility={video.visibility} />
            {!isOwner && video.uploaderDisplayName ? (
              <span
                className="rounded bg-surface/5 px-1.5 py-0.5 text-ink2"
                title={video.uploaderSlug ? `@${video.uploaderSlug}` : undefined}
              >
                by {video.uploaderDisplayName}
              </span>
            ) : null}
            {/*
              Phase 35.3 (2026-06-17): hide the Cloudflare Stream
              `status` field when it's the happy path. "ready" is an
              internal transcoding state — agents asked "what does
              ready mean?" because by the time they're managing a
              video it's almost always ready. Only surface non-ready
              statuses (queued / inprogress / error) — those mean
              the agent has to wait or re-upload.
            */}
            {video.status !== 'ready' ? (
              <span className={video.status === 'error' ? 'text-red-400' : 'text-muted'}>
                {video.status === 'error' ? 'Upload failed' : 'Processing…'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* actions row — wraps on narrow screens. Only the uploader sees it. */}
      {isOwner ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ActionButton onClick={() => setEditingCat((s) => !s)} disabled={pending}>
            {editingCat ? 'cancel' : 'edit category'}
          </ActionButton>
          {video.visibility === 'public' ? (
            <>
              <ActionButton onClick={() => handleVisibility('private')} disabled={pending}>
                mark private
              </ActionButton>
              <ActionButton onClick={() => handleVisibility('archived')} disabled={pending}>
                archive
              </ActionButton>
            </>
          ) : (
            <ActionButton onClick={() => handleVisibility('public')} disabled={pending}>
              make public
            </ActionButton>
          )}
          {video.visibility === 'private' ? (
            <ActionButton onClick={() => handleVisibility('archived')} disabled={pending}>
              archive
            </ActionButton>
          ) : null}
          <ActionButton onClick={handleDelete} disabled={pending} tone="danger">
            delete
          </ActionButton>
        </div>
      ) : null}

      {editingCat && isOwner ? (
        <div className="mt-3 rounded border border-line bg-bg p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-ink2">Re-categorize</div>
          <CategoryPicker
            mode="edit"
            selected={(video.category as CommunityVideoCategoryId) ?? 'walk_the_block'}
            onPick={handleCategoryPick}
            disabled={pending}
          />
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </li>
  );
}

function VisibilityChip({ visibility }: { visibility: CommunityVideoVisibility }) {
  if (visibility === 'public') {
    return <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">live</span>;
  }
  if (visibility === 'private') {
    return <span className="rounded bg-surface/10 px-1.5 py-0.5 text-ink2">private</span>;
  }
  return <span className="rounded bg-ink2/30 px-1.5 py-0.5 text-ink2">archived</span>;
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'min-h-9 rounded border px-2.5 py-1 text-[11px] transition disabled:opacity-50',
        tone === 'danger'
          ? 'border-red-500/40 text-red-300 hover:border-red-400 hover:bg-red-500/10'
          : 'border-line text-ink2 hover:border-line-strong hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
