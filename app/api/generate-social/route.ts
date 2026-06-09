/**
 * POST /api/generate-social — generate Facebook + Instagram copy for a listing.
 * Phase 6.3a.
 *
 * Differences from /api/generate-copy:
 *   - Takes `listing_id` (not free-form fields). Social copy needs a public
 *     URL that points at *this listing*, so we resolve the listing from the
 *     authed agent's owned set, then build the URL server-side from agent
 *     slug + listing slug. Client cannot forge listingUrl.
 *   - `highlights` is a transient UI input (3-5 short selling points). Not
 *     persisted — see CLAUDE.md §0.2 (no speculative schema). Capped at 5
 *     entries × 80 chars to bound prompt size.
 *   - Rate-limited under kind='social_copy' (separate bucket from listing
 *     copy so social retries don't starve description generation).
 *
 * Origin pinning: the public URL host is taken from the request's
 * `origin` header (same-origin POST from the dashboard). If unset (curl
 * with no origin), fall back to NEXT_PUBLIC_SITE_URL, then the request URL
 * origin. We never trust a client-supplied host.
 */

import { generateSocialCopy } from '@/lib/ai/anthropic';
import { checkAndRecord } from '@/lib/ai/rate-limit';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const Input = z.object({
  listing_id: z.string().uuid(),
  highlights: z.array(z.string().trim().min(1).max(80)).max(5).optional(),
});

function originFor(req: Request): string {
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/+$/, '');
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, '');
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const agentLookup = await (supabase as any)
    .from('agents')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle();
  const agent = agentLookup.data as { id: string; slug: string } | null;
  if (!agent) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // RLS scopes this to the agent's own listings — no separate ownership check
  // needed. A wrong listing_id (other agent's, or unknown) → null.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const listingLookup = await (supabase as any)
    .from('listings')
    .select('slug, address, city, state, price, beds, baths')
    .eq('id', parsed.data.listing_id)
    .maybeSingle();
  const listing = listingLookup.data as {
    slug: string;
    address: string;
    city: string;
    state: string;
    price: number | null;
    beds: number | null;
    baths: number | null;
  } | null;
  if (!listing) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  }

  const service = createServiceClient();
  const limit = await checkAndRecord(service, agent.id, 'social_copy');
  if (!limit.ok) {
    if (limit.reason === 'rate_limited') {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  const listingUrl = `${originFor(req)}/v/${agent.slug}/${listing.slug}`;

  try {
    const out = await generateSocialCopy({
      listingUrl,
      address: listing.address,
      city: listing.city,
      state: listing.state,
      price: listing.price ?? undefined,
      beds: listing.beds ?? undefined,
      baths: listing.baths ?? undefined,
      highlights: parsed.data.highlights,
    });
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error('[generate-social] anthropic call failed', err);
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
  }
}
