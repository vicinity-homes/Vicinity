/**
 * Style 1 — Editorial Magazine.
 *
 * Big serif address, hero image (or video override), 3-column spec strip,
 * a magazine pull-quote treatment for the community blurb. Mobile-first;
 * on tablet+ (≥768px) a two-column reading flow places hero media left
 * (~60%) and the info column right (~40%) for richer above-the-fold density.
 *
 * No gold; pure paper + ink. Single primary CTA per visible screen.
 *
 * Phase 40.3 added: About / Community block w/ landmarks / Agent contact card.
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
  formatSpecs,
  listingFullUrl,
} from './shared';

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
  const specs = formatSpecs(listing.beds, listing.baths, listing.sqft);
  const blurb = communityBlurb(community?.description ?? null);
  const about = aboutBlurbFor(listing.id, listing.description ?? null);
  const agentInitial = agent.name.trim().charAt(0).toUpperCase() || 'V';
  const agentBio = agentBlurbFor(agent.name);

  return (
    <main className="min-h-screen bg-bg text-ink">
      {/* Eyebrow */}
      <header className="mx-auto max-w-3xl px-5 pt-8 pb-4 sm:px-8">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
          {listing.city}, {listing.state} · Featured listing
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-[1.1] tracking-tighter text-ink sm:text-5xl">
          {listing.address}
        </h1>
        {price ? <p className="mt-2 font-serif text-xl text-ink2 sm:text-2xl">{price}</p> : null}
      </header>

      {/* Hero + tablet two-col info rail */}
      <section className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
          <figure className="relative overflow-hidden rounded-sm bg-surface">
            {heroVideo ? (
              <video
                src={heroVideo}
                poster={heroImage}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-[4/5] h-auto w-full object-cover sm:aspect-[16/10]"
              >
                <track kind="captions" />
              </video>
            ) : (
              // biome-ignore lint/nursery/noImgElement: external CDN, no Image config
              <img
                src={heroImage}
                alt={listing.address}
                className="aspect-[4/5] h-auto w-full object-cover sm:aspect-[16/10]"
              />
            )}
          </figure>

          {/* Info rail — mobile renders below hero, tablet+ to the right */}
          <aside className="space-y-6">
            {specs.length > 0 ? (
              <dl className="border-line border-y py-4">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between py-1.5">
                    <dt className="text-[11px] uppercase tracking-eyebrow text-ink2">{s.label}</dt>
                    <dd className="font-serif text-xl text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div>
              <p className="text-[11px] uppercase tracking-eyebrow text-ink2">About this home</p>
              <p className="mt-2 text-ink text-sm leading-relaxed">{about}</p>
            </div>
            {/* Agent contact card */}
            <div className="flex items-center gap-3 border-line border-t pt-5">
              <div
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-serif text-cream text-lg"
              >
                {agentInitial}
              </div>
              <div className="min-w-0">
                <a
                  href={agentFullUrl(agent.slug)}
                  className="block truncate font-serif text-base text-ink hover:underline"
                >
                  {agent.name}
                </a>
                <p className="mt-0.5 truncate text-ink2 text-xs">{agentBio}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Community block w/ landmarks */}
      {community ? (
        <section className="mx-auto mt-12 max-w-3xl px-5 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-[2fr_3fr] sm:items-center">
            {communityImage ? (
              // biome-ignore lint/nursery/noImgElement: external CDN
              <img
                src={communityImage}
                alt={community.name}
                className="aspect-[4/5] w-full rounded-sm object-cover"
              />
            ) : null}
            <figure className="border-line-strong border-l-2 pl-5">
              <p className="text-[11px] uppercase tracking-eyebrow text-ink2">The neighborhood</p>
              <h2 className="mt-1 font-serif text-2xl text-ink sm:text-3xl">{community.name}</h2>
              {blurb ? (
                <blockquote className="mt-2 text-ink2 text-sm leading-relaxed">{blurb}</blockquote>
              ) : null}
              <ul className="mt-3 space-y-1 text-ink text-sm">
                {DEMO_LANDMARKS.map((l) => (
                  <li key={l.name} className="flex items-baseline gap-2">
                    <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
                      {l.distance}
                    </span>
                    <span>{l.name}</span>
                  </li>
                ))}
              </ul>
              {communitySlug ? (
                <a
                  href={communityFullUrl(communitySlug)}
                  className="mt-4 inline-block text-ink text-sm underline decoration-line-strong underline-offset-4 hover:text-ink"
                >
                  View community details →
                </a>
              ) : null}
            </figure>
          </div>
        </section>
      ) : null}

      {/* Photo gallery (if we have more than one) */}
      {album.length > 1 ? (
        <section className="mx-auto mt-12 max-w-5xl px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Gallery</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {album.slice(1, 7).map((src) => (
              // biome-ignore lint/nursery/noImgElement: external CDN
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-square w-full rounded-sm object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto mt-14 mb-16 max-w-2xl px-5 text-center sm:px-8">
        <a
          href={listingFullUrl(agent.slug, listing.slug)}
          className="inline-flex items-center justify-center rounded-full bg-ink px-7 py-3 text-cream text-sm tracking-wide transition hover:bg-accent-dark"
        >
          View full listing →
        </a>
        <p className="mt-4 text-ink2 text-xs">
          Listed by{' '}
          <a
            href={agentFullUrl(agent.slug)}
            className="underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            {agent.name}
          </a>
        </p>
      </section>
    </main>
  );
}
