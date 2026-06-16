/**
 * Preview-as-buyer helpers (Phase 27.3, 2026-06-16).
 *
 * Lets a logged-in agent see what the platform looks like to a buyer
 * without signing out. Implemented via an httpOnly cookie:
 *
 *   vicinity_preview_as_buyer=1
 *
 * Semantics (方案 A — cookie only affects rendering):
 *   - The user's real Supabase session is unchanged. Server actions still
 *     run with the agent's auth.uid() — no spoofing.
 *   - `getEffectiveViewerRole()` returns 'buyer' for the duration of the
 *     preview, so nav, headers, and read-side affordances render the
 *     buyer surface.
 *   - Agent-only routes (/dashboard/*) detect the preview cookie at the
 *     layout level and redirect to the buyer landing, so the agent can't
 *     accidentally land on an admin page during a preview.
 *   - Write actions don't need extra guards in V1: agents simply can't
 *     reach the upload / edit UI while previewing because the dashboard
 *     redirects out, and buyer surfaces have no write affordances aimed
 *     at agents. (V2: re-evaluate if buyer pages ever expose
 *     agent-context buttons.)
 */

import { cookies } from 'next/headers';

export const PREVIEW_COOKIE = 'vicinity_preview_as_buyer';

export async function isPreviewingAsBuyer(): Promise<boolean> {
  const c = await cookies();
  return c.get(PREVIEW_COOKIE)?.value === '1';
}
