import { createClient } from '@/lib/supabase/server';
/**
 * Sign-out endpoint — POSTed by the TopBar form.
 *
 * Clears the Supabase auth cookies via the SSR client, then redirects to /login.
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
