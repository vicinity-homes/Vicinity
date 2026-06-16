'use server';

/**
 * Server actions to toggle preview-as-buyer mode (Phase 27.3).
 *
 * Only agents can enter preview. Anyone can exit (idempotent).
 * Cookie is httpOnly so it can't be flipped from client JS.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PREVIEW_COOKIE } from '@/lib/auth/preview';

export async function enableBuyerPreview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // biome-ignore lint/suspicious/noExplicitAny: agents typing not in stub yet
  const { data: agent } = (await (supabase as any)
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null };

  if (!agent) {
    // Non-agents have nothing to preview — silently no-op.
    redirect('/profile');
  }

  const c = await cookies();
  c.set(PREVIEW_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Session cookie — clears on browser close so a forgotten preview
    // doesn't persist forever.
  });
  redirect('/communities');
}

export async function disableBuyerPreview() {
  const c = await cookies();
  c.delete(PREVIEW_COOKIE);
  redirect('/dashboard');
}
