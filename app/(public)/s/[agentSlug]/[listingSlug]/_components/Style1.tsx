/**
 * Style 1 — The Listing Dossier.
 *
 * Phase 41 (2026-06-20): replaces phase 40 Editorial Magazine. Information-
 * dense research-poster look — five numbered panels (①–⑤), serif address +
 * mono specs, paper tone, burgundy `dossier` accent on the price and the
 * "this home" tag. Single source of truth for the showcase route's primary
 * style.
 *
 * Prototype reference: public/prototypes/dossier.html (visual sign-off
 * 2026-06-20). Differs from prototype in: real listing/community/agent
 * data; community gets its own panel ③ (full neighborhood photo + landmark
 * list) instead of being a sub-block; panel ④ Numbers is a pure data table
 * — no fake "comps" chart (decision 2026-06-20: don't fabricate comparable
 * comps; honesty > visual richness, and we don't have a comps source yet).
 *
 * Layout: mobile = single-column stack, panels separated by hairline rules.
 * Tablet+ (≥768px) = ①+② first row two-up, ③+④ second row two-up, ⑤ full
 * width. Numbered black circle badge top-left of each panel. Hero video
 * lives inside panel ① (NOT full-bleed). All media routes through demo-media
 * via shared.ts — do not read listing.cover_url here.
 *
 * Hard rules:
 * - No gold/chromatic accents. `dossier` (burgundy) only on price + "this
 *   home" chip — do not bleed elsewhere.
 * - Single primary CTA at the bottom of panel ⑤. Secondary "view full
 *   listing" is the pill below.
 * - Panel headers: numbered badge + uppercase mono label.
 * - Specs in mono font for the data-density signal.
 */

import {
  DEMO_LANDMARKS,
  type ShowcaseData,
  aboutBlurbFor,
  agentBlurbFor,
  agentFullUrl,
  communityBlurb,
  communityFullUrl,
  formatPrice,
  listingFullUrl,
} from './shared';

function PanelNum({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="mr-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-[13px] text-cream"
    >
      {n}
    </span>
  );
}

function PanelHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-4 flex items-center font-mono text-[11px] text-ink uppercase tracking-eyebrow">
      <PanelNum n={n} />
      <span>{label}</span>
    </div>
  );
}

function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-line border-b border-dotted py-1.5">
      <span className="font-mono text-[11px] text-ink2 uppercase tracking-[0.12em]">{k}</span>
      <span className="font-mono font-semibold text-[13px] text-ink">{v}</span>
    </div>
  );
}

export function Style1Editorial({
  data,
  communitySlug,
}: {
  data: ShowcaseData;
  communitySlug: string | null;
}) {
  const { bundle, heroImage, heroVideo, album, communityImage } = data;
  const { listing, agent, community } = bundle;
  const price = formatPrice(listing.price);
  const blurb = communityBlurb(community?.description ?? null);
  const about = aboutBlurbFor(listing.id, listing.description ?? null);
  const agentInitial = agent.name.trim().charAt(0).toUpperCase() || 'V';
  const agentBio = agentBlurbFor(agent.name);

  // Per-sqft chip — listing-derived, no comps. Decision 2026-06-20.
  const pricePerSqft =
    listing.price && listing.sqft
      ? `$${Math.round(listing.price / listing.sqft).toLocaleString()} / sqft`
      : null;

  // Panel ② photos — first 4 album entries (after hero). Falls back gracefully
  // when album is short (demoPhotosFor guarantees ≥4 in demo mode).
  const interiorPhotos = album.slice(1, 5);

  return (
    <main className="min-h-screen bg-bg text-ink">
      {/* Top band — magazine masthead style */}
      <div className="border-line-strong border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-2.5 font-mono text-[11px] text-ink uppercase tracking-eyebrow sm:px-8">
          <span>
            <strong className="font-semibold">Vicinity</strong> · Listing Dossier
          </span>
          <span className="text-ink2">No. {listing.id.slice(0, 4).toUpperCase()}</span>
        </div>
      </div>

      {/* Masthead — address + price + meta */}
      <header className="mx-auto max-w-5xl border-line-strong border-b-2 px-5 pt-7 pb-6 sm:px-8">
        <p className="font-mono text-[11px] text-ink2 uppercase tracking-eyebrow">
          {listing.city}, {listing.state} · For private sale
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink leading-[1.02] tracking-tighter sm:text-6xl">
          {listing.address}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-ink uppercase tracking-[0.08em]">
          {price ? <span className="font-semibold text-[15px] text-dossier">{price}</span> : null}
          {listing.beds != null ? (
            <span>
              {listing.beds} <strong className="font-semibold">bd</strong>
            </span>
          ) : null}
          {listing.baths != null ? (
            <span>
              {listing.baths} <strong className="font-semibold">ba</strong>
            </span>
          ) : null}
          {listing.sqft != null ? (
            <span>
              {listing.sqft.toLocaleString()} <strong className="font-semibold">sqft</strong>
            </span>
          ) : null}
          {pricePerSqft ? (
            <span className="border border-dossier px-2 py-0.5 text-[10px] text-dossier">
              {pricePerSqft}
            </span>
          ) : null}
        </div>
      </header>

      {/* Panels grid: ①+② / ③+④ / ⑤ full */}
      <div className="mx-auto max-w-5xl md:grid md:grid-cols-2">
        {/* Panel ① — The Home (hero video + about) */}
        <section className="border-line border-b px-5 py-7 md:border-r sm:px-8">
          <PanelHeader n={1} label="The Home" />
          <figure className="overflow-hidden border border-line-strong bg-surface">
            {heroVideo ? (
              <video
                src={heroVideo}
                poster={heroImage}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-[4/5] h-auto w-full object-cover"
              >
                <track kind="captions" />
              </video>
            ) : (
              // biome-ignore lint/nursery/noImgElement: external CDN, no Image config
              <img
                src={heroImage}
                alt={listing.address}
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            )}
          </figure>
          <p className="mt-3 font-mono text-[10.5px] text-ink2 uppercase tracking-[0.18em]">
            Fig. 1 — Walkthrough
          </p>
          <p className="mt-4 text-ink2 text-sm leading-relaxed">{about}</p>
        </section>

        {/* Panel ② — Inside (photo grid + spec table) */}
        <section className="border-line border-b px-5 py-7 sm:px-8">
          <PanelHeader n={2} label="Inside" />
          {interiorPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {interiorPhotos.map((src) => (
                // biome-ignore lint/nursery/noImgElement: external CDN
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-square w-full border border-line-strong object-cover"
                />
              ))}
            </div>
          ) : null}
          <dl className="mt-5 grid grid-cols-2 gap-x-5">
            {listing.beds != null ? <SpecRow k="Bedrooms" v={String(listing.beds)} /> : null}
            {listing.baths != null ? <SpecRow k="Bathrooms" v={String(listing.baths)} /> : null}
            {listing.sqft != null ? <SpecRow k="Sq ft" v={listing.sqft.toLocaleString()} /> : null}
            <SpecRow k="HOA" v="$0" />
          </dl>
        </section>

        {/* Panel ③ — The Neighborhood (community photo + landmarks) */}
        {community ? (
          <section className="border-line border-b px-5 py-7 md:border-r sm:px-8">
            <PanelHeader n={3} label="The Neighborhood" />
            {communityImage ? (
              // biome-ignore lint/nursery/noImgElement: external CDN
              <img
                src={communityImage}
                alt={community.name}
                className="aspect-[16/10] w-full border border-line-strong object-cover"
              />
            ) : null}
            <h2 className="mt-4 font-serif text-2xl text-ink">{community.name}</h2>
            {blurb ? <p className="mt-2 text-ink2 text-sm leading-relaxed">{blurb}</p> : null}
            <ul className="mt-4">
              {DEMO_LANDMARKS.map((l) => (
                <li
                  key={l.name}
                  className="flex items-baseline justify-between border-line border-b border-dotted py-1.5 font-mono text-[12px]"
                >
                  <span className="text-ink">{l.name}</span>
                  <span className="font-semibold text-ink">{l.distance}</span>
                </li>
              ))}
            </ul>
            {communitySlug ? (
              <a
                href={communityFullUrl(communitySlug)}
                className="mt-4 inline-block font-mono text-[11px] text-ink uppercase tracking-eyebrow underline decoration-line-strong underline-offset-4"
              >
                View community →
              </a>
            ) : null}
          </section>
        ) : (
          // Empty placeholder panel keeps the 2-col grid balanced when no community.
          <section className="border-line border-b px-5 py-7 md:border-r sm:px-8">
            <PanelHeader n={3} label="The Neighborhood" />
            <p className="text-ink2 text-sm">Neighborhood details forthcoming.</p>
          </section>
        )}

        {/* Panel ④ — The Numbers (pure data table — no fake chart) */}
        <section className="border-line border-b px-5 py-7 sm:px-8">
          <PanelHeader n={4} label="The Numbers" />
          <dl>
            {price ? <SpecRow k="List price" v={price} /> : null}
            {pricePerSqft ? <SpecRow k="$ / sqft" v={pricePerSqft.replace(' / sqft', '')} /> : null}
            <SpecRow k="HOA" v="$0" />
            <SpecRow k="Status" v={listing.status === 'published' ? 'Active' : 'Off-market'} />
            <SpecRow k="Listed" v="On Vicinity" />
          </dl>
          <p className="mt-4 font-mono text-[10.5px] text-ink2 uppercase tracking-[0.18em]">
            Comparable sales available upon request.
          </p>
        </section>

        {/* Panel ⑤ — Represented by (full width on tablet) */}
        <section className="px-5 py-7 sm:px-8 md:col-span-2">
          <PanelHeader n={5} label="Represented by" />
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-serif text-cream text-xl"
            >
              {agentInitial}
            </div>
            <div className="min-w-0">
              <a href={agentFullUrl(agent.slug)} className="block font-serif text-ink text-xl">
                {agent.name}
              </a>
              <p className="mt-1 font-mono text-[11px] text-ink2 uppercase tracking-eyebrow">
                {agentBio}
              </p>
            </div>
          </div>
          <a
            href={listingFullUrl(agent.slug, listing.slug)}
            className="mt-6 block bg-ink py-4 text-center font-mono text-[12px] text-cream uppercase tracking-eyebrow"
          >
            Schedule a private tour →
          </a>
          <a
            href={listingFullUrl(agent.slug, listing.slug)}
            className="mt-2 block border border-line-strong py-4 text-center font-mono text-[12px] text-ink uppercase tracking-eyebrow"
          >
            Open full listing on Vicinity
          </a>
        </section>
      </div>

      {/* Footer band */}
      <footer className="border-line-strong border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 font-mono text-[10.5px] text-ink2 uppercase tracking-eyebrow sm:px-8">
          <span>Vicinity · vicinities.cc</span>
          <span>Dossier {listing.id.slice(0, 4).toUpperCase()}</span>
        </div>
      </footer>
    </main>
  );
}
