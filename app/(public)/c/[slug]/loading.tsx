/**
 * Suspense skeleton for /c/[slug]. Phase 45.10: hero shrunk to 16:7 / 21:7,
 * grid uses unified 3:4 cards.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative aspect-[16/7] w-full animate-pulse bg-surface md:aspect-[21/5] sm:rounded-b-xl">
        <div className="absolute inset-x-0 bottom-0 px-4 py-3 sm:px-6 sm:py-4">
          <div className="h-7 w-2/3 rounded bg-ink2/20" />
          <div className="mt-2 h-4 w-1/3 rounded bg-ink2/20" />
        </div>
      </div>

      <div className="px-4 py-4 md:px-6">
        <div className="-mx-1 mb-5 flex items-center gap-1">
          <div className="h-9 w-40 animate-pulse rounded-full bg-ink2/20" />
          <div className="h-9 w-36 animate-pulse rounded-full bg-ink2/20" />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5 md:gap-y-12">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            <div key={i}>
              <div className="aspect-[3/4] animate-pulse bg-surface" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-ink2/20" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink2/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
