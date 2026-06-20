'use server';

/**
 * Phase 4.7 — archive / unarchive server actions.
 *
 * Soft-delete via status='archived'. Public page already filters
 * status='published' so archived listings auto-404 — no public-page changes
 * needed.
 *
 * Unarchive flips back to 'draft' (NOT 'published'). Returning straight to
 * 'published' would silently re-expose a listing the agent intentionally
 * pulled; forcing them through the publish gate again is the safer default.
 *
 * No archived_at column — schema doesn't have one. If audit timestamps are
 * ever needed we can add a migration; for V1 we trust supabase's row-level
 * audit log + git-tracked actions.
 *
 * RLS handles ownership (agents can only update their own listings).
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function archiveListing(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: listing } = (await (supabase as any)
    .from('listings')
    .select('id, agent_id, slug')
    .eq('id', listingId)
    .maybeSingle()) as { data: { id: string; agent_id: string; slug: string } | null };

  if (!listing) return { ok: false, error: 'listing not found' };

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { error } = await (supabase as any)
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', listingId);

  if (error) return { ok: false, error: error.message };

  // Revalidate public path so any cached published version drops to 404.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: agent } = (await (supabase as any)
    .from('agents')
    .select('slug')
    .eq('id', listing.agent_id)
    .maybeSingle()) as { data: { slug: string } | null };

  if (agent?.slug) {
    revalidatePath(`/v/${agent.slug}/${listing.slug}`);
  }
  revalidatePath('/dashboard');

  return { ok: true };
}

export async function unarchiveListing(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { error } = await (supabase as any)
    .from('listings')
    .update({ status: 'draft' })
    .eq('id', listingId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Phase 45.14 (2026-06-20): permanent listing delete.
 *
 * Hard-deletes the listing row. FK cascades on `listing_videos`,
 * `listing_photos`, `events`, `leads` (NB: `leads` references listings without
 * `on delete cascade` — they reference `public.listings` only, so we manually
 * remove leads first to avoid FK violation). Cloudflare Stream videos and
 * Supabase storage photos are NOT scrubbed here — V1 keeps the parity with
 * the existing per-asset delete actions which also leave external state
 * behind on listing teardown. If/when storage cleanup matters we can add a
 * background sweeper.
 *
 * Owner-gated by RLS: agents can only delete their own listings.
 */
export async function deleteListing(
  listingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: listing } = (await (supabase as any)
    .from('listings')
    .select('id, agent_id, slug')
    .eq('id', listingId)
    .maybeSingle()) as { data: { id: string; agent_id: string; slug: string } | null };
  if (!listing) return { ok: false, error: 'listing not found' };

  // Leads reference listings without cascade — clear them first.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  await (supabase as any).from('leads').delete().eq('listing_id', listingId);

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { error } = await (supabase as any).from('listings').delete().eq('id', listingId);
  if (error) return { ok: false, error: error.message };

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: agent } = (await (supabase as any)
    .from('agents')
    .select('slug')
    .eq('id', listing.agent_id)
    .maybeSingle()) as { data: { slug: string } | null };
  if (agent?.slug) {
    revalidatePath(`/v/${agent.slug}/${listing.slug}`);
    revalidatePath(`/v/${agent.slug}`);
  }
  revalidatePath('/dashboard');
  revalidatePath('/browse');
  return { ok: true };
}
