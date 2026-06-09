'use client';

/**
 * LeadsLive — three-layer freshness for the agent's lead inbox.
 *
 * Layer 1 (initial): SSR-hydrated rows passed in via `initial`.
 * Layer 2 (Realtime): postgres_changes INSERT subscription on public.leads.
 *   RLS limits payloads to leads the calling agent can SELECT (own listings).
 * Layer 3 (polling fallback): every 8s, refetch the most-recent leads and
 *   merge by id (last-write-wins on notified_at). Always-on while page is
 *   mounted — leads are bursty and email-flow latency matters.
 *
 * Reference impl pattern: see references/email-notification-pipeline.md and
 * the listing-videos live equivalent (Phase 2.4 hotfix).
 */

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  notified_at: string | null;
  created_at: string;
  listing_id: string;
  listings: {
    address: string | null;
    city: string | null;
    state: string | null;
    slug: string | null;
  } | null;
};

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function LeadsLive({ initial }: { initial: LeadRow[] }) {
  const [rows, setRows] = useState<LeadRow[]>(initial);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const merge = useCallback((incoming: LeadRow[]) => {
    setRows((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      for (const r of incoming) byId.set(r.id, { ...byId.get(r.id), ...r });
      return [...byId.values()].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      );
    });
  }, []);

  // Layer 2: Realtime INSERT subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('leads-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        async (payload) => {
          // Realtime payload doesn't include joined listings — refetch the
          // single row with the join so the UI shows address.
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          // biome-ignore lint/suspicious/noExplicitAny: stub generated types
          const { data } = (await (supabase as any)
            .from('leads')
            .select(
              'id, name, email, phone, message, source, notified_at, created_at, listing_id, listings(address, city, state, slug)',
            )
            .eq('id', id)
            .maybeSingle()) as { data: LeadRow | null };
          if (data) merge([data]);
        },
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const next = payload.new as Partial<LeadRow> & { id?: string };
        if (!next.id) return;
        const existing = rowsRef.current.find((r) => r.id === next.id);
        if (!existing) return;
        merge([{ ...existing, ...next } as LeadRow]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [merge]);

  // Layer 3: polling fallback (always on while mounted, 8s)
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const tick = async () => {
      // biome-ignore lint/suspicious/noExplicitAny: stub generated types
      const { data } = (await (supabase as any)
        .from('leads')
        .select(
          'id, name, email, phone, message, source, notified_at, created_at, listing_id, listings(address, city, state, slug)',
        )
        .order('created_at', { ascending: false })
        .limit(50)) as { data: LeadRow[] | null };
      if (!cancelled && data) merge(data);
    };
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [merge]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-bronze/40 bg-ink2 px-8 py-16 text-center">
        <p className="text-sm text-cream/70">
          No leads yet. When a buyer submits the form on a published listing, it will appear here in
          real time.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-bronze/20 rounded border border-bronze/30 bg-ink2">
      {rows.map((l) => {
        const addr = l.listings?.address ?? '(unknown listing)';
        const cityState =
          l.listings?.city && l.listings?.state ? `${l.listings.city}, ${l.listings.state}` : '';
        const sent = l.notified_at != null;
        return (
          <li
            key={l.id}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-bronze/10"
          >
            <Link href={`/dashboard/leads/${l.id}`} className="min-w-0 flex-1" prefetch={false}>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-cream">{l.name}</p>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${
                    sent
                      ? 'border-gold/30 bg-gold/15 text-gold'
                      : 'border-bronze/40 bg-bronze/10 text-cream/70'
                  }`}
                  title={sent ? `Email sent ${timeAgo(l.notified_at as string)}` : 'Email pending'}
                >
                  {sent ? 'sent' : 'pending'}
                </span>
              </div>
              <p className="truncate text-xs text-cream/60">
                {addr}
                {cityState ? ` · ${cityState}` : ''}
              </p>
              {l.message ? (
                <p className="mt-1 line-clamp-1 text-xs text-cream/50">{l.message}</p>
              ) : null}
            </Link>
            <div className="text-right text-[11px] text-cream/50">{timeAgo(l.created_at)}</div>
          </li>
        );
      })}
    </ul>
  );
}
