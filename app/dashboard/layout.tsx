import { createClient } from '@/lib/supabase/server';
import { isPreviewingAsBuyer } from '@/lib/auth/preview';
/**
 * Dashboard layout — gates all /dashboard/* routes behind auth.
 *
 * Phase 26 (2026-06-14): the dashboard-specific <TopBar> is gone — the
 * global <SiteHeader> in the root layout now handles desktop chrome for
 * agent routes too (role=agent shows Dashboard / Leads / + New / avatar).
 * This file is now just an auth gate + page wrapper.
 */
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fdashboard');
  }

  // Phase 27.3: while previewing as buyer, /dashboard/* should bounce
  // back to the buyer surface — so an agent in preview mode can't
  // accidentally land on admin pages by clicking a stale link.
  if (await isPreviewingAsBuyer()) {
    redirect('/communities');
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-6 py-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
