/**
 * Dashboard home — empty state for V1 (task 1.5).
 *
 * Logged-in agents who haven't created a listing yet land here. Phase 4 will
 * replace this with the real listings index when the listings table + creation
 * flow exist. The "+ New listing" CTA links to /listings/new (route lands in
 * Phase 4); clicking it before then 404s, which is acceptable for V1 internal
 * preview.
 */
import Link from 'next/link';

export default function DashboardHomePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div
        className="w-full max-w-xl rounded-2xl border-2 border-dashed px-8 py-16 text-center"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          aria-hidden
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(201, 162, 39, 0.12)' }}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">No listings yet</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Create your first listing to start collecting leads from buyers who swipe in.
        </p>

        <Link
          href="/listings/new"
          className="mt-8 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
          style={{
            background: 'var(--brand)',
            color: '#0c0c0c',
          }}
        >
          + New listing
        </Link>
      </div>
    </div>
  );
}
