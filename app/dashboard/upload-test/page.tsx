import { VideoUploader } from '@/components/dashboard/VideoUploader';
import { createClient } from '@/lib/supabase/server';
/**
 * /dashboard/upload-test — standalone page to test the Phase 2 video pipeline
 * end-to-end before listings CRUD ships in Phase 4.
 *
 * Each agent gets a private fake listing (slug `__upload_test__`) auto-seeded
 * on first visit. The VideoUploader component POSTs to /api/video/create-upload
 * and streams bytes directly to Cloudflare via tus. Existing videos for this
 * listing are listed below the uploader so you can see new rows appear and
 * (after the webhook lands in task 2.3) flip from `processing` to `ready`.
 *
 * Phase 4 will delete this page and the seeded rows.
 */
import { redirect } from 'next/navigation';

const TEST_LISTING_SLUG = '__upload_test__';

interface ListingVideo {
  id: string;
  cf_video_id: string;
  kind: string;
  title: string | null;
  status: string;
  created_at: string;
}

export default async function UploadTestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fdashboard%2Fupload-test');

  // Look up the agent row for this user (created by handle_new_user trigger).
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: agent } = (await (supabase as any)
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null };

  if (!agent) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p style={{ color: 'var(--muted)' }}>
          No agent record found for this user. Sign out and back in to retrigger setup.
        </p>
      </div>
    );
  }

  // Idempotent fake-listing seed: one per agent, keyed on slug.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  let { data: listing } = (await (supabase as any)
    .from('listings')
    .select('id')
    .eq('agent_id', agent.id)
    .eq('slug', TEST_LISTING_SLUG)
    .maybeSingle()) as { data: { id: string } | null };

  if (!listing) {
    // biome-ignore lint/suspicious/noExplicitAny: stub generated types
    const { data: created, error: insertErr } = (await (supabase as any)
      .from('listings')
      .insert({
        agent_id: agent.id,
        slug: TEST_LISTING_SLUG,
        address: 'Phase 2 upload test (placeholder)',
        city: 'Test',
        state: 'GA',
        status: 'draft',
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: unknown };

    if (insertErr || !created) {
      console.error('[upload-test] seed listing failed', insertErr);
      return (
        <div className="mx-auto max-w-2xl py-12 text-center">
          <p style={{ color: '#f87171' }}>Failed to seed test listing. Check server logs.</p>
        </div>
      );
    }
    listing = created;
  }

  // Fetch existing videos for this test listing.
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data: videosRaw } = (await (supabase as any)
    .from('listing_videos')
    .select('id, cf_video_id, kind, title, status, created_at')
    .eq('listing_id', listing.id)
    .order('created_at', { ascending: false })) as { data: ListingVideo[] | null };

  const videos = videosRaw ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upload test</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Phase 2 pipeline harness. Uploads attach to a private placeholder listing and will be
          cleaned up when listings CRUD ships in Phase 4.
        </p>
      </header>

      <VideoUploader listingId={listing.id} />

      <section className="space-y-3">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          Videos on this test listing ({videos.length})
        </h2>

        {videos.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No uploads yet.
          </p>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <table className="w-full text-sm">
              <thead style={{ color: 'var(--muted)' }}>
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">CF ID</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 truncate max-w-[16rem]">{v.title ?? '—'}</td>
                    <td className="px-4 py-3">{v.kind}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={v.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      {v.cf_video_id.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    processing: { bg: 'rgba(201, 162, 39, 0.15)', fg: 'var(--brand)' },
    ready: { bg: 'rgba(34, 197, 94, 0.15)', fg: '#22c55e' },
    error: { bg: 'rgba(248, 113, 113, 0.15)', fg: '#f87171' },
  };
  const c = colors[status] ?? { bg: 'var(--border)', fg: 'var(--muted)' };
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}
