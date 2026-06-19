/**
 * Style 1 — Editorial Magazine.
 *
 * Big serif address, hero image (or video override), 3-column spec strip,
 * a magazine pull-quote treatment for the community blurb. Mobile-first;
 * scales up on desktop with wider gutters, never a different layout.
 *
 * No gold; pure paper + ink. Single primary CTA per visible screen.
 */

import {
  type ShowcaseData,
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

      {/* Hero media */}
      <section className="mx-auto max-w-5xl px-5 sm:px-8">
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
      </section>

      {/* Spec strip */}
      {specs.length > 0 ? (
        <section className="mx-auto mt-8 max-w-3xl border-line border-y px-5 py-6 sm:px-8">
          <dl className="grid grid-cols-3 gap-4">
            {specs.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-[10px] uppercase tracking-eyebrow text-ink2">{s.label}</dt>
                <dd className="mt-1 font-serif text-2xl text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Description */}
      {listing.description && listing.description.length > 0 ? (
        <section className="mx-auto mt-10 max-w-2xl px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">About</p>
          <div className="mt-3 space-y-4 text-base leading-relaxed text-ink">
            {listing.description
              .filter((s) => s && s.trim().length > 0)
              .map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
          </div>
        </section>
      ) : null}

      {/* Community pull-quote */}
      {community && blurb ? (
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
              <blockquote className="mt-2 font-serif text-xl leading-snug text-ink sm:text-2xl">
                “{blurb}”
              </blockquote>
              <figcaption className="mt-3 text-ink2 text-sm">
                — {community.name}
                {communitySlug ? (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      href={communityFullUrl(communitySlug)}
                      className="underline decoration-line-strong underline-offset-4 hover:text-ink"
                    >
                      View community details →
                    </a>
                  </>
                ) : null}
              </figcaption>
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
