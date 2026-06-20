/**
 * DesktopSidebarWrapper — Server Component that resolves the viewer role
 * and renders <DesktopSidebar>. Phase 45 (2026-06-20).
 */

import { createClient } from '@/lib/supabase/server';
import { DesktopSidebar } from './DesktopSidebar';
import type { ViewerRole } from './nav-config';

export async function DesktopSidebarWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: ViewerRole = 'anon';
  if (user) {
    // biome-ignore lint/suspicious/noExplicitAny: agents typing not in stub yet
    const { data: agent } = (await (supabase as any)
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()) as { data: { id: string } | null };
    role = agent ? 'agent' : 'buyer';
  }

  return <DesktopSidebar role={role} />;
}
