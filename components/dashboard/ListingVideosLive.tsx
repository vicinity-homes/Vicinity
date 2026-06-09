'use client';

import { createClient } from '@/lib/supabase/client';
/**
 * Live-updating list of videos for a single listing.
 *
 * Hydrates from the server-rendered initial snapshot (avoiding a flash of
 * empty state), then subscribes to Postgres changes on `listing_videos`
 * filtered by listing_id. The Cloudflare Stream webhook flips status
 * processing → ready; this UI reflects that transition without a refresh.
 *
 * RLS still applies to Realtime: this component will only receive events
 * for rows the agent's session can SELECT.
 */
import { useEffect, useState } from 'react';

export interface ListingVideoRow {
  id: string;
  cf_video_id: string;
  kind: string;
  title: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  processing: { bg: 'rgba(201, 162, 39, 0.15)', fg: 'var(--brand)' },
  ready: { bg: 'rgba(34, 197, 94, 0.15)', fg: '#22c55e' },
  error: { bg: 'rgba(248, 113, 113, 0.15)', fg: '#f87171' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'var(--border)', fg: 'var(--muted)' };
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

interface Props {
  listingId: string;
  initialVideos: ListingVideoRow[];
}

export function ListingVideosLive({ listingId, initialVideos }: Props) {
  const [videos, setVideos] = useState<ListingVideoRow[]>(initialVideos);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`listing_videos:${listingId}`)
      .on(
        // biome-ignore lint/suspicious/noExplicitAny: supabase-js Realtime payload generics
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'listing_videos',
          filter: `listing_id=eq.${listingId}`,
        },
        // biome-ignore lint/suspicious/noExplicitAny: payload.new shape depends on event
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ListingVideoRow;
            setVideos((prev) => (prev.some((v) => v.id === row.id) ? prev : [row, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as ListingVideoRow;
            setVideos((prev) => prev.map((v) => (v.id === row.id ? { ...v, ...row } : v)));
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id: string };
            setVideos((prev) => prev.filter((v) => v.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
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
  );
}
