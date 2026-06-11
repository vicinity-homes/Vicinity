'use client';

/**
 * Phase 4.6 — publish / unpublish UI panel.
 * Phase 8/listing-form-ux (2026-06-11) — translate raw missing[] keys returned
 * by publishListing into human-readable labels with concrete fix hints. Old UX
 * showed e.g. "beds" / "at least one ready video" verbatim, which read as
 * cryptic when an agent had filled placeholders that looked like real values.
 *
 * Public URL is shown when published so the agent can copy/share immediately.
 */

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { archiveListing, unarchiveListing } from './archive-actions';
import { publishListing, unpublishListing } from './publish-actions';

interface Props {
  listingId: string;
  status: string;
  agentSlug: string | null;
  listingSlug: string;
}

/**
 * Translate raw publish-gate keys into agent-facing labels + fix hints.
 * Keep keys in sync with publish-actions.ts `missing.push(...)` calls.
 */
const MISSING_LABELS: Record<string, { label: string; hint: string }> = {
  address: {
    label: 'Property address',
    hint: 'Address is set when the listing is created and cannot be edited here.',
  },
  price: {
    label: 'List price',
    hint: 'Enter a list price greater than $0.',
  },
  beds: {
    label: 'Bedrooms',
    hint: 'Pick a value (0 = studio).',
  },
  baths: {
    label: 'Bathrooms',
    hint: 'Pick a value greater than 0.',
  },
  'at least one ready video': {
    label: 'At least one ready video',
    hint: 'Upload a video above and wait for its status to show "Ready" before publishing.',
  },
};

function describeMissing(key: string): { label: string; hint: string } {
  const hit = MISSING_LABELS[key];
  if (hit) return hit;
  // Fallback: show the raw key so unknown gates aren't silently swallowed.
  return { label: key, hint: '' };
}

export function PublishPanel({ listingId, status, agentSlug, listingSlug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [missing, setMissing] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isPublished = status === 'published';
  const isArchived = status === 'archived';
  const publicUrl = agentSlug ? `/v/${agentSlug}/${listingSlug}` : null;

  function handlePublish() {
    setMissing(null);
    setErr(null);
    startTransition(async () => {
      const res = await publishListing(listingId);
      if (res.ok) {
        router.refresh();
      } else {
        setMissing(res.missing);
      }
    });
  }

  function handleUnpublish() {
    setMissing(null);
    setErr(null);
    startTransition(async () => {
      const res = await unpublishListing(listingId);
      if (res.ok) {
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function handleArchive() {
    if (!confirm('Archive this listing? It will be hidden from the dashboard and 404 publicly.'))
      return;
    setMissing(null);
    setErr(null);
    startTransition(async () => {
      const res = await archiveListing(listingId);
      if (res.ok) {
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function handleUnarchive() {
    setMissing(null);
    setErr(null);
    startTransition(async () => {
      const res = await unarchiveListing(listingId);
      if (res.ok) {
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="rounded border border-bronze/30 bg-ink2 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            Status:{' '}
            <span
              className={isPublished ? 'text-gold' : isArchived ? 'text-cream/40' : 'text-cream/70'}
            >
              {status}
            </span>
          </h2>
          {isPublished && publicUrl && (
            <p className="mt-1 text-xs text-cream/60">
              Public URL:{' '}
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gold hover:underline"
              >
                {publicUrl}
              </a>
            </p>
          )}
          {isArchived && (
            <p className="mt-1 text-xs text-cream/60">
              Hidden from the public site and the dashboard's default view. Unarchive returns it to
              draft.
            </p>
          )}
          {!isPublished && !isArchived && (
            <p className="mt-1 text-xs text-cream/60">
              Required to publish: address, list price, bedrooms, bathrooms, and at least one ready
              video.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isArchived ? (
            <button
              type="button"
              onClick={handleUnarchive}
              disabled={isPending}
              className="rounded border border-bronze/50 px-4 py-2 text-sm font-medium text-cream hover:bg-bronze/20 disabled:opacity-50"
            >
              {isPending ? 'Unarchiving…' : 'Unarchive'}
            </button>
          ) : (
            <>
              {isPublished ? (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={isPending}
                  className="rounded border border-bronze/50 px-4 py-2 text-sm font-medium text-cream hover:bg-bronze/20 disabled:opacity-50"
                >
                  {isPending ? 'Unpublishing…' : 'Unpublish'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPending}
                  className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold/90 disabled:opacity-50"
                >
                  {isPending ? 'Publishing…' : 'Publish'}
                </button>
              )}
              <button
                type="button"
                onClick={handleArchive}
                disabled={isPending}
                className="rounded border border-bronze/30 px-3 py-2 text-xs text-cream/60 hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>
      {missing && missing.length > 0 && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <p className="font-medium text-red-300">
            Can't publish yet — please fix the following and try again:
          </p>
          <ul className="mt-2 space-y-2 pl-1 text-red-200/90">
            {missing.map((m) => {
              const { label, hint } = describeMissing(m);
              return (
                <li key={m} className="flex gap-2">
                  <span aria-hidden="true" className="text-red-300">
                    •
                  </span>
                  <span>
                    <span className="font-medium">{label}</span>
                    {hint ? <span className="ml-1 text-red-200/70">— {hint}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {err && (
        <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Error: {err}
        </p>
      )}
    </div>
  );
}
