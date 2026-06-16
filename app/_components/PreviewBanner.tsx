/**
 * PreviewBanner — sticky top banner shown to agents while previewing
 * the buyer view (Phase 27.3).
 *
 * Server component. Mounted once in the root layout; renders nothing
 * unless the preview cookie is set AND the underlying user is actually
 * an agent (defensive — in case the cookie was set then the agents row
 * was deleted). The "Exit preview" button is a tiny form posting to a
 * server action so it works without client JS.
 */

import { createClient } from '@/lib/supabase/server';
import { isPreviewingAsBuyer } from '@/lib/auth/preview';
import { disableBuyerPreview } from '@/app/_actions/preview';

export async function PreviewBanner() {
  if (!(await isPreviewingAsBuyer())) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // biome-ignore lint/suspicious/noExplicitAny: agents typing not in stub yet
  const { data: agent } = (await (supabase as any)
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null };
  if (!agent) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gold px-4 py-2 text-center text-ink text-xs">
      <span className="font-medium">Previewing as buyer</span>
      <span className="opacity-60">·</span>
      <form action={disableBuyerPreview}>
        <button
          type="submit"
          className="rounded-full bg-ink px-3 py-1 text-cream text-xs transition active:scale-95"
        >
          Exit preview
        </button>
      </form>
    </div>
  );
}
