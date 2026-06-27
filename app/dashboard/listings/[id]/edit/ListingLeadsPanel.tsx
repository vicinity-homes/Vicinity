/**
 * ListingLeadsPanel — per-listing leads view embedded in the edit hub.
 *
 * Phase 67.2 (2026-06-27): aligned with the redesigned `/dashboard/leads`
 * inbox — sticky column headers (≥ sm), clickable row navigates to lead
 * detail, Source column is the type enum ("Listing" — community leads
 * never reach this panel since the join is on `listing_id`), Email + SMS
 * icon buttons replace the old text pills. Listing column is omitted
 * because every row in this panel belongs to the same listing.
 *
 * Server component. Fetches leads scoped to one listing_id (RLS gates to
 * agent-owned listings). No realtime — refreshes on hub navigation, which
 * is sufficient for this panel.
 */

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  followed_up_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

const OPEN_DOT_COLOR = '#6b7a5a';

export async function ListingLeadsPanel({ listingId }: { listingId: string }) {
  const supabase = await createClient();
  // biome-ignore lint/suspicious/noExplicitAny: stub generated types
  const { data } = (await (supabase as any)
    .from('leads')
    .select('id, name, email, phone, message, followed_up_at, created_at')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(50)) as { data: LeadRow[] | null };

  const leads = data ?? [];

  if (leads.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="mx-auto max-w-md py-8 text-center">
          <p className="text-ink2 text-sm">No leads on this listing yet.</p>
          <p className="mt-1 text-muted text-xs">
            Leads from the public listing page will appear here in real time.
          </p>
          <Link
            href="/dashboard/leads"
            className="mt-4 inline-block text-[13px] text-ink underline-offset-2 hover:underline"
          >
            See all leads
          </Link>
        </div>
      </section>
    );
  }

  const openCount = leads.filter((l) => !l.followed_up_at).length;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-base font-semibold">
          Leads
          <span className="ml-2 text-muted text-sm font-normal">
            {leads.length} total
            {openCount > 0 ? ` · ${openCount} awaiting follow-up` : ''}
          </span>
        </h2>
        <Link
          href="/dashboard/leads"
          className="text-muted text-xs underline-offset-2 hover:text-ink hover:underline"
        >
          See all leads →
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-line/60">
        {/* Desktop column header */}
        <div
          className="hidden sm:grid grid-cols-[10px_minmax(0,200px)_minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b border-line/60 bg-bg/40 px-3 py-2 text-[11px] uppercase tracking-wide text-muted"
          role="row"
        >
          <span aria-hidden />
          <span>Name</span>
          <span>Message</span>
          <span className="text-center">Contact</span>
          <span>Source</span>
          <span>Received</span>
        </div>
        <ul>
          {leads.map((l) => {
            const open = !l.followed_up_at;
            const sms = l.phone ? `sms:${l.phone.replace(/[^+\d]/g, '')}` : null;
            const mailto = l.email ? `mailto:${l.email}` : null;
            return (
              <li
                key={l.id}
                className={`relative block sm:grid sm:grid-cols-[10px_minmax(0,200px)_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-4 border-t border-line/60 px-3 py-3 first:border-t-0 hover:bg-line/15 ${
                  open ? '' : 'opacity-55'
                }`}
              >
                {/* Row-level overlay link */}
                <Link
                  href={`/dashboard/leads/${l.id}`}
                  prefetch={false}
                  aria-hidden
                  tabIndex={-1}
                  className="absolute inset-0 z-0"
                >
                  <span className="sr-only">Open lead {l.name}</span>
                </Link>

                {/* MOBILE */}
                <div className="sm:hidden relative z-10 pointer-events-none">
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={
                        open
                          ? { backgroundColor: OPEN_DOT_COLOR }
                          : { border: '1px solid rgba(49,49,49,0.2)' }
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          open ? 'font-medium text-ink' : 'text-ink2'
                        }`}
                        title={l.name}
                      >
                        {l.name}
                      </span>
                      {l.message ? (
                        <p
                          className="line-clamp-1 text-[11px] text-ink2"
                          title={l.message}
                        >
                          {l.message}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-muted">
                        Listing · {timeAgo(l.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 pointer-events-auto">
                      {mailto ? (
                        <a
                          href={mailto}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Email ${l.name}`}
                          title={`Email ${l.email}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 hover:border-ink/30 hover:bg-line/30 hover:text-ink"
                        >
                          <EmailIcon />
                        </a>
                      ) : null}
                      {sms ? (
                        <a
                          href={sms}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Text ${l.name}`}
                          title={`Text ${l.phone}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink2 hover:border-ink/30 hover:bg-line/30 hover:text-ink"
                        >
                          <SmsIcon />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* DESKTOP */}
                <div className="contents max-sm:hidden">
                  <span
                    aria-hidden
                    className="hidden sm:block relative z-10 pointer-events-none h-2 w-2 rounded-full"
                    style={
                      open
                        ? { backgroundColor: OPEN_DOT_COLOR }
                        : { border: '1px solid rgba(49,49,49,0.2)' }
                    }
                  />
                  <span
                    className={`hidden sm:block relative z-10 pointer-events-none truncate text-sm ${
                      open ? 'font-medium text-ink' : 'text-ink2'
                    }`}
                    title={l.name}
                  >
                    {l.name}
                  </span>
                  <span
                    className="hidden sm:block relative z-10 pointer-events-none min-w-0 truncate text-sm text-ink2"
                    title={l.message ?? ''}
                  >
                    {l.message ?? ''}
                  </span>
                  <div className="hidden sm:flex relative z-10 shrink-0 items-center gap-1.5">
                    {mailto ? (
                      <a
                        href={mailto}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Email ${l.name}`}
                        title={`Email ${l.email}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink2 hover:border-ink/30 hover:bg-line/30 hover:text-ink"
                      >
                        <EmailIcon />
                      </a>
                    ) : (
                      <span
                        aria-hidden
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line/50 text-muted/50"
                        title="No email"
                      >
                        <EmailIcon />
                      </span>
                    )}
                    {sms ? (
                      <a
                        href={sms}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Text ${l.name}`}
                        title={`Text ${l.phone}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink2 hover:border-ink/30 hover:bg-line/30 hover:text-ink"
                      >
                        <SmsIcon />
                      </a>
                    ) : (
                      <span
                        aria-hidden
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line/50 text-muted/50"
                        title="No phone"
                      >
                        <SmsIcon />
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block relative z-10 pointer-events-none text-xs text-ink2">
                    Listing
                  </span>
                  <span className="hidden sm:block relative z-10 pointer-events-none shrink-0 text-muted text-[11px] tabular-nums">
                    {timeAgo(l.created_at)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function EmailIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
