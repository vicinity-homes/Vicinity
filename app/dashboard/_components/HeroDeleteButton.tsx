'use client';

/**
 * HeroDeleteButton — visible chromeless delete affordance for the listing
 * hero (Phase 47.11). Replaces the ⋯ menu: agents told us they want one
 * click to delete with a confirm, no hidden overflow.
 *
 * Visual: chromeless rose tint matching HeroControl pattern, distinct color
 * so destruction is signalled without a separate menu.
 */

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { deleteListingAndRedirect } from '@/app/dashboard/listings/[id]/edit/archive-actions';

export function HeroDeleteButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        'Permanently delete this listing? Videos, photos, leads and analytics will be removed. This cannot be undone.',
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteListingAndRedirect(listingId);
        router.refresh();
      } catch (e) {
        if (e && typeof e === 'object' && 'digest' in e) throw e;
        alert(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Delete listing"
      className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-[12.5px] text-rose-100 transition-all duration-150 hover:border-rose-300/40 hover:bg-rose-500/30 hover:text-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.18)] hover:backdrop-blur-md hover:[text-shadow:none] active:scale-[0.97] disabled:opacity-60"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
