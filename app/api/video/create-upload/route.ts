import { createDirectUpload } from '@/lib/cloudflare/stream';
import { createClient } from '@/lib/supabase/server';
import { VideoCreateUpload } from '@/lib/zod/schemas';
/**
 * POST /api/video/create-upload
 *
 * Creates a Cloudflare Stream direct-upload URL and pre-inserts a
 * `listing_videos` row with status='processing'. The browser then uploads
 * directly to Cloudflare via tus; we never see the bytes.
 *
 * Auth: anon client + RLS. The caller must own the target listing.
 * Phase 2 scope: listings only. `scope='community'` is rejected (V2).
 */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = VideoCreateUpload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Phase 2 limits scope to listing videos. Community uploads are V2.
  if (input.scope !== 'listing') {
    return NextResponse.json({ error: 'scope_not_supported' }, { status: 400 });
  }

  // Verify listing ownership via RLS — query returns a row only if the
  // current agent owns it (or a 0-row result otherwise). Treat absence as
  // 404 to avoid leaking listing existence to non-owners.
  const { data: listing, error: listingErr } = (await supabase
    .from('listings')
    .select('id')
    .eq('id', input.parent_id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown };

  if (listingErr) {
    return NextResponse.json({ error: 'listing_lookup_failed' }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  }

  // Reserve a Cloudflare Stream slot. maxDurationSeconds=300 enforces the
  // 5-minute cap server-side (task 2.5). 2 GB byte cap is enforced by zod.
  let uploadUrl: string;
  let videoId: string;
  try {
    const result = await createDirectUpload({
      uploadLength: input.upload_length,
      maxDurationSeconds: 300,
      meta: input.title ? { name: input.title } : undefined,
    });
    uploadUrl = result.uploadUrl;
    videoId = result.videoId;
  } catch (err) {
    console.error('[create-upload] cloudflare error', err);
    return NextResponse.json({ error: 'upload_provider_failed' }, { status: 502 });
  }

  // Pre-insert the row so the webhook handler (task 2.3) can flip it to
  // 'ready' by cf_video_id. Insert via anon client — RLS allows the owner
  // to insert listing_videos under their own listing.
  // database.types.ts is a stub (see TODO in app/dashboard/layout.tsx); cast
  // through `any` so insert payload typing isn't `never`. Phase-end regen will
  // remove the cast.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: row, error: insertErr } = (await (supabase as any)
    .from('listing_videos')
    .insert({
      listing_id: input.parent_id,
      cf_video_id: videoId,
      kind: input.kind,
      title: input.title ?? null,
      status: 'processing',
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: unknown };

  if (insertErr || !row) {
    console.error('[create-upload] insert failed', insertErr);
    return NextResponse.json({ error: 'row_insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, videoId, rowId: row.id });
}
