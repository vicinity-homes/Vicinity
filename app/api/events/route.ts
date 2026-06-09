/**
 * POST /api/events — bulk insert behavioral events from the public listing feed.
 *
 * Phase 3.7. Anon-callable (no auth). The browser POSTs a batch via
 * `navigator.sendBeacon` from `lib/events/track.ts`. Inserts into the
 * existing `events` table (anon-INSERT RLS policy from 0001_init.sql).
 *
 * Validation: every event passes through a zod schema. Bad events drop the
 * whole batch with 400 — clients shouldn't be sending malformed payloads.
 *
 * Service-role client used because the anon RLS policy permits inserts but
 * the bulk insert is faster server-side without RLS round-trips. The route
 * is intentionally minimal: no rate limiting (Phase 6), no PII fields
 * (CLAUDE.md §3.6).
 */

import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const ClientEvent = z.object({
  event_type: z.enum(['page_view', 'card_view', 'video_complete']),
  listing_id: z.string().uuid(),
  card_id: z.string().max(80).optional(),
  session_id: z.string().min(1).max(80),
  meta: z.record(z.unknown()).optional(),
});

const Payload = z.object({
  events: z.array(ClientEvent).min(1).max(100),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const rows = parsed.data.events.map((e) => ({
    event_type: e.event_type,
    listing_id: e.listing_id,
    card_id: e.card_id ?? null,
    session_id: e.session_id,
    meta: e.meta ?? null,
  }));

  const supabase = createServiceClient();
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types — TODO(phase3-end): pnpm db:types regen
  const { error } = await (supabase as any).from('events').insert(rows);
  if (error) {
    // Don't leak DB details to the client. Server logs the error.
    console.error('[events] insert failed', error.message);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
